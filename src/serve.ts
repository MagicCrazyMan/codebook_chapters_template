import cors from "@koa/cors";
import chalk from "chalk";
import chokidar from "chokidar";
import { IncomingMessage, Server, ServerResponse } from "http";
import Koa, { ParameterizedContext } from "koa";
import mime from "mime-types";
import { extname, join } from "path";
import { PassThrough } from "stream";
import { options } from "./args.js";
import {
  DISTRIBUTION_DIRECTORY_PATH,
  SOURCE_DIRECTORY_PATH,
  build,
  distributionFs,
} from "./index.js";
import { log } from "./log.js";

enum SSEEvent {
  Rebuild = 0,
}

type SSEMessage = {
  type: SSEEvent;
  [key: string]: unknown;
};

// Server listen address
const LISTEN_ADDRESS = options.server_listen;
// Server listen port
const LISTEN_PORT = options.server_port;
// Server base URL
const BASE_URL = options.server_base_url.startsWith("/")
  ? options.server_base_url
  : `/${options.server_base_url}`;
// Server-Side Event path
const SSE_PATH = "/sse";

/**
 * Sends SSE message
 * @param stream sse stream
 * @param message message
 */
const sendSSEMessage = (stream: PassThrough, message: SSEMessage) => {
  stream.write("event: message\n");
  stream.write(`data: ${JSON.stringify(message)}`);
  stream.write("\n\n");
};

/**
 * Process SSE request
 * @param ctx koa context
 * @param sseStreams collection of sse stream
 */
const requestSSE = async (
  ctx: ParameterizedContext<Koa.DefaultState, Koa.DefaultContext, unknown>,
  sseStreams: PassThrough[]
) => {
  ctx.req.socket.setKeepAlive(true);
  ctx.set({
    "Content-Type": "text/event-stream",
    Connection: "keep-alive",
  });
  ctx.status = 200;

  const stream = new PassThrough();

  stream.on("close", () => {
    const index = sseStreams.indexOf(stream);
    if (index >= 0) {
      sseStreams.splice(index, 1);
    }
  });
  sseStreams.push(stream);
  ctx.body = stream;
};

/**
 * Process static file request
 * @param ctx koa context
 */
const requestStatic = async (
  ctx: ParameterizedContext<Koa.DefaultState, Koa.DefaultContext, unknown>
) => {
  const filePath = join(DISTRIBUTION_DIRECTORY_PATH, ctx.path.slice(BASE_URL.length));
  const exists = await new Promise((resolve) => {
    resolve(distributionFs.existsSync(filePath) && distributionFs.lstatSync(filePath).isFile());
  });

  if (!exists) ctx.throw(404);

  const result = await new Promise<Error | Buffer>((resolve, reject) => {
    distributionFs.readFile(filePath, (err, data) => {
      if (err) {
        reject(err);
      } else {
        resolve(data);
      }
    });
  });

  if (result instanceof Error) ctx.throw(result.message ?? undefined, 500);

  ctx.set("Cache-Control", "no-cache, no-store");
  ctx.type = mime.lookup(extname(filePath)) || "application/octet-stream";
  ctx.body = result;
};

/**
 * Creates koa http server
 * @returns koa http server
 */
const createServer = () => {
  const koa = new Koa();
  const sseStreams: PassThrough[] = [];
  // allow CORS
  koa.use(
    cors({
      allowMethods: "GET",
      origin: "*",
    })
  );
  // dispatch requests
  koa.use(async (ctx, next) => {
    const path = ctx.path;
    if (path.startsWith(BASE_URL)) {
      if (path === join(BASE_URL, SSE_PATH)) {
        await requestSSE(ctx, sseStreams);
      } else {
        await requestStatic(ctx);
      }
    } else {
      ctx.throw(404);
    }

    return await next();
  });
  // logging
  koa.use(async (ctx, next) => {
    const method = ctx.method;
    const path = ctx.path;
    const remote = ctx.ip;

    const msg0 = chalk.cyanBright(`${method} ${path}`);
    const msg1 = chalk.magentaBright(remote);

    let color;
    if (ctx.status >= 200 && ctx.status < 300) {
      color = chalk.greenBright;
    } else {
      color = chalk.redBright;
    }
    const msg2 = color(`${ctx.status} ${ctx.message ?? ""}`);

    log(`${msg0} from ${msg1} ${msg2}`);

    return await next();
  });

  return { koa, sseStreams };
};

/**
 * Watch files changes in source directory and rebuild
 * @param sseStreams Server-Side Event streams
 */
const watch = (sseStreams: PassThrough[]) => {
  const watcher = chokidar.watch(SOURCE_DIRECTORY_PATH);
  watcher.on("change", async () => {
    log(chalk.greenBright("source files modified, rebuilding..."));
    try {
      await build();
      log(chalk.greenBright("rebuild finished"));

      sseStreams.forEach((stream) => {
        sendSSEMessage(stream, { type: SSEEvent.Rebuild });
      });
    } catch (err) {
      console.error(err);
      log(chalk.redBright(`rebuild failed ${err instanceof Error ? err.message : err}`));
    }
  });

  log("start watching source files for modification");

  return watcher;
};

let watcher: chokidar.FSWatcher | null;
let server: Server<typeof IncomingMessage, typeof ServerResponse> | null;
/**
 * Build and start serving
 */
export const serve = async () => {
  await build();
  const { koa, sseStreams } = createServer();
  watcher = watch(sseStreams);
  server = koa.listen(LISTEN_PORT, LISTEN_ADDRESS);
  await new Promise((resolve) => {
    server?.addListener("listening", resolve);
  });

  log(
    "server start serving on: " +
      chalk.greenBright(`http://${LISTEN_ADDRESS}:${LISTEN_PORT}${BASE_URL}`)
  );

  await new Promise((resolve) => {
    process.on("SIGINT", resolve);
    server?.on("close", resolve);
  });

  await watcher.close();
  await new Promise((resolve) => {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    server!.close(resolve);
  });
  distributionFs.rmdirSync(DISTRIBUTION_DIRECTORY_PATH, { recursive: true });

  log("server stopped");
};
