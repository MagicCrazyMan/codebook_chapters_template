import * as fs from "fs";
import { fs as memfs } from "memfs";
import { join, resolve as resolvePath } from "node:path";
import { basename, dirname } from "path";
import { options } from "./args.js";
import { resolvePrelude } from "./prelude.js";
import { serve } from "./serve.js";

// Filesystem for source directory
export const sourceFs = fs;
// Filesystem for distribution directory
export const distributionFs = (options.serve ? memfs : fs) as typeof fs;

// Root directory of chapters
export const SOURCE_DIRECTORY_PATH = resolvePath(options.src);
// Distribution directory in memory file system
const MEMORY_FS_DISTRIBUTION_DIRECTORY_PATH = "/dist";
// Distribution directory
export const DISTRIBUTION_DIRECTORY_PATH = options.serve
  ? MEMORY_FS_DISTRIBUTION_DIRECTORY_PATH
  : resolvePath(options.dist);
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
// Libs directory name
export const LIBS_DIRECTORY_NAME = "libs";

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
  copyDirectory();
  await resolvePrelude();
};

const copyableFilenames = [
  JAVASCRIPT_FILENAME,
  INTRODUCTION_FILENAME,
  HTML_FILENAME,
  STYLESHEET_FILENAME,
  DESCRIPTION_FILENAME,
  PREVIEW_IMAGE_FILENAME,
];
/**
 * Copies files from source directory to distribution directory
 */
const copyDirectory = () => {
  const entries = sourceFs.readdirSync(SOURCE_DIRECTORY_PATH);
  while (entries.length !== 0) {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const entry = entries.shift()!;

    const stat = sourceFs.lstatSync(join(SOURCE_DIRECTORY_PATH, entry));
    if (stat.isFile()) {
      if (dirname(entry) !== LIBS_DIRECTORY_NAME && !copyableFilenames.includes(basename(entry)))
        continue;

      distributionFs.writeFileSync(
        join(DISTRIBUTION_DIRECTORY_PATH, entry),
        sourceFs.readFileSync(join(SOURCE_DIRECTORY_PATH, entry))
      );
    } else if (stat.isDirectory()) {
      const dirPath = join(DISTRIBUTION_DIRECTORY_PATH, entry);
      if (!distributionFs.existsSync(dirPath) || !distributionFs.lstatSync(dirPath).isDirectory()) {
        distributionFs.mkdirSync(dirPath);
      }

      for (const subentry of sourceFs.readdirSync(join(SOURCE_DIRECTORY_PATH, entry))) {
        entries.push(join(entry, subentry));
      }
    }
  }
};

if (options.serve) {
  await serve();
} else {
  await build();
}
