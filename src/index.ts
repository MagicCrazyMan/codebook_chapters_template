import chalk from "chalk";
import * as fs from "fs";
import { fs as memfs } from "memfs";
import { join, resolve } from "node:path";
import { basename } from "path";
import { options } from "./args.js";
import { resolvePrelude } from "./chapter.js";
import { log } from "./log.js";
import { serve } from "./serve.js";

// Filesystem for source directory
export const sourceFs = fs;
// Filesystem for distribution directory
export const distributionFs = (options.serve ? memfs : fs) as typeof fs;

// Root directory of chapters
export const SOURCE_DIRECTORY_PATH = resolve(options.src);
// Distribution directory in memory file system
const MEMORY_FS_DISTRIBUTION_DIRECTORY_PATH = "/dist";
// Distribution directory
export const DISTRIBUTION_DIRECTORY_PATH = options.serve
  ? resolve(MEMORY_FS_DISTRIBUTION_DIRECTORY_PATH)
  : resolve(options.dist);

// Source directory hint JSON filename
export const HINT_FILENAME = "index.json";
// Javascript filename
export const JAVASCRIPT_FILENAME = "index.js";
// Introduction filename
export const INTRODUCTION_FILENAME = "index.json";
// HTML filename
export const HTML_FILENAME = "index.html";
// Stylesheet filename
export const STYLESHEET_FILENAME = "index.css";
// Description filename
export const DESCRIPTION_FILENAME = "index.md";
// Preview image filename
export const PREVIEW_IMAGE_FILENAME = "index.png";
// Introduction filename
export const DISTRIBUTION_PRELUDE_FILENAME = "index.json";

/**
 * Build all chapters
 */
export const build = async () => {
  if (
    distributionFs.lstatSync(DISTRIBUTION_DIRECTORY_PATH, { throwIfNoEntry: false })?.isDirectory()
  ) {
    distributionFs.rmdirSync(DISTRIBUTION_DIRECTORY_PATH, { recursive: true });
  }
  distributionFs.mkdirSync(DISTRIBUTION_DIRECTORY_PATH);

  const hint = loadHint();
  copyChapters(hint);
  await resolvePrelude(hint);
};

// Filenames that allow to copy outside limitless directories
export const COPYABLE_FILENAMES = [
  JAVASCRIPT_FILENAME,
  INTRODUCTION_FILENAME,
  HTML_FILENAME,
  STYLESHEET_FILENAME,
  DESCRIPTION_FILENAME,
  PREVIEW_IMAGE_FILENAME,
];

type RawHint = {
  noResolves?: string[];
  imports?: Record<string, string>;
};

/**
 * Gets a default hint information
 * @returns Default hint information
 */
const getDefaultHint = () =>
  ({
    noResolves: [],
    imports: {},
  } as Required<RawHint>);

/**
 * Hint information
 */
export type Hint = {
  noResolvesInSource: string[];
  noResolvesInDistribution: string[];
  imports: Record<string, string>;
};

/**
 * Gets hint information from source directory,
 * returns a default one if not exists.
 * @returns Hint information
 */
const loadHint = () => {
  const rawHint = getDefaultHint();

  const hintFilePath = join(SOURCE_DIRECTORY_PATH, HINT_FILENAME);
  if (sourceFs.lstatSync(hintFilePath, { throwIfNoEntry: false })?.isFile()) {
    Object.assign(rawHint, JSON.parse(sourceFs.readFileSync(hintFilePath, "utf-8")) as RawHint);
  }

  const hint = {
    noResolvesInSource: rawHint.noResolves.map((path) => join(SOURCE_DIRECTORY_PATH, path)),
    noResolvesInDistribution: rawHint.noResolves.map((path) =>
      join(DISTRIBUTION_DIRECTORY_PATH, path)
    ),
    imports: rawHint.imports,
  } as Hint;

  return hint;
};

/**
 * Copies chapter files from source directory to distribution directory
 * @param hint Hint information
 */
const copyChapters = ({ noResolvesInSource }: Hint) => {
  const entries = sourceFs.readdirSync(SOURCE_DIRECTORY_PATH);

  while (entries.length !== 0) {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const entry = entries.shift()!;

    const sourcePath = join(SOURCE_DIRECTORY_PATH, entry);
    const destPath = join(DISTRIBUTION_DIRECTORY_PATH, entry);

    const noResolve = noResolvesInSource.some((path) => sourcePath.startsWith(path));

    const stat = sourceFs.lstatSync(sourcePath);
    if (stat.isFile()) {
      if (noResolve || COPYABLE_FILENAMES.includes(basename(entry))) {
        distributionFs.writeFileSync(destPath, sourceFs.readFileSync(sourcePath));
      }
    } else if (stat.isDirectory()) {
      if (!distributionFs.lstatSync(destPath, { throwIfNoEntry: false })?.isDirectory()) {
        distributionFs.mkdirSync(destPath);
      }

      for (const subentry of sourceFs.readdirSync(sourcePath)) {
        entries.push(join(entry, subentry));
      }
    }
  }
};

if (options.serve) {
  await serve();
} else {
  log(chalk.greenBright("Start building..."));
  await build();
  log(chalk.greenBright("Build finished"));
}
