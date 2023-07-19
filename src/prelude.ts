import { basename, dirname, extname, join, resolve as resolvePath } from "node:path";
import parseImports from "parse-imports";
import {
  DESCRIPTION_FILENAME,
  DISTRIBUTION_DIRECTORY_PATH,
  DISTRIBUTION_PRELUDE_FILENAME,
  HTML_FILENAME,
  Hint,
  INTRODUCTION_FILENAME,
  JAVASCRIPT_FILENAME,
  PREVIEW_IMAGE_FILENAME,
  STYLESHEET_FILENAME,
  distributionFs,
} from "./index.js";

/**
 * Chapter introduction
 */
type ChapterIntroduction = {
  zIndex?: number;
  title?: string;
  intro?: string;
};

/**
 * Chapter descriptor type
 */
enum ChapterDescriptorType {
  Instance = 0,
  Directory = 1,
}

/**
 * Chapter descriptor
 */
type ChapterDescriptor = ChapterInstance | ChapterDirectory;

/**
 * Chapter instance
 */
type ChapterInstance = {
  zIndex?: number;
  type: ChapterDescriptorType.Instance;
  entry: string;
  libs: [];
  title?: string;
  intro?: string;
  hasHTML: boolean;
  hasStylesheet: boolean;
  hasDescription: boolean;
  hasPreviewImage: boolean;
};

/**
 * Chapter directory
 */
type ChapterDirectory = {
  zIndex?: number;
  type: ChapterDescriptorType.Directory;
  entry: string;
  children: ChapterDescriptor[];
  title?: string;
  intro?: string;
};

/**
 * Prelude information
 */
type Prelude = {
  imports: Record<string, string>;
  descriptors: ChapterDescriptor[];
};

/**
 * Reads introduction json file
 * @param entry Entry
 * @returns ChapterIntroduction
 */
const readIntroduction = (entry: string) => {
  // read introduction
  const introPath = join(DISTRIBUTION_DIRECTORY_PATH, entry, INTRODUCTION_FILENAME);
  if (distributionFs.lstatSync(introPath, { throwIfNoEntry: false })?.isFile()) {
    return JSON.parse(distributionFs.readFileSync(introPath, "utf-8")) as ChapterIntroduction;
  }

  return {} as ChapterIntroduction;
};

/**
 * Normalize javascript filename extension
 * @param filename Javascript filename
 * @returns Normalized javascript filename.
 */
const normalizeJavascriptExtension = (filename: string) =>
  extname(filename) === ".js" ? filename : `${filename}.js`;

/**
 * Recursively collects local lib.
 * @param entry Entry
 * @returns collection of local libs
 */
const collectLocalImports = async (entry: string) => {
  const entryFullPath = resolvePath(DISTRIBUTION_DIRECTORY_PATH, entry);

  const scripts = [
    {
      code: distributionFs.readFileSync(join(entryFullPath, JAVASCRIPT_FILENAME), "utf-8"),
      fullPath: join(entryFullPath, JAVASCRIPT_FILENAME),
    },
  ];

  const libs = new Set<string>();
  for (let script = scripts.shift(); script; script = scripts.shift()) {
    let { code } = script;
    const { fullPath } = script;
    const replacements = new Map<string, string>();

    for (const { moduleSpecifier } of [...(await parseImports(code))]) {
      if (!moduleSpecifier.value) continue;
      if (libs.has(moduleSpecifier.value)) continue;
      if (moduleSpecifier.type !== "relative" && moduleSpecifier.type !== "absolute") continue;

      const lib = normalizeJavascriptExtension(moduleSpecifier.value);
      libs.add(lib);

      // replace library name if modified
      if (lib !== moduleSpecifier.value) {
        replacements.set(moduleSpecifier.value, lib);
      }
    }

    if (replacements.size > 0) {
      replacements.forEach((value, key) => {
        code = code.replace(key, value);
      });

      distributionFs.writeFileSync(fullPath, code);
    }
  }

  return Array.from(libs);
};

/**
 * Resolve chapter instance
 * @param entry Entry
 * @returns Chapter instance
 */
const resolveInstance = async (entry: string) => {
  const entryFullPath = resolvePath(DISTRIBUTION_DIRECTORY_PATH, entry);

  // read introduction
  const { title, intro, zIndex } = readIntroduction(entry);

  const hasHTML = distributionFs.existsSync(join(entryFullPath, HTML_FILENAME));
  const hasStylesheet = distributionFs.existsSync(join(entryFullPath, STYLESHEET_FILENAME));
  const hasDescription = distributionFs.existsSync(join(entryFullPath, DESCRIPTION_FILENAME));
  const hasPreviewImage = distributionFs.existsSync(join(entryFullPath, PREVIEW_IMAGE_FILENAME));
  const libs = await collectLocalImports(entry);

  return {
    zIndex,
    type: ChapterDescriptorType.Instance,
    entry: basename(entry),
    libs,
    title: title ?? entry,
    intro,
    hasHTML,
    hasStylesheet,
    hasDescription,
    hasPreviewImage,
  } as ChapterInstance;
};

/**
 * Resolve chapter directory
 * @param entry Entry, relative path
 * @param noResolves Directories that only copy
 * @returns Chapter instance
 */
const resolveDirectory = async (noResolves: string[], entry = "") => {
  const entryFullPath = resolvePath(DISTRIBUTION_DIRECTORY_PATH, entry);

  // read introduction
  const { title, intro, zIndex } = readIntroduction(entry);

  // iterate entries and resolve
  const children: ChapterDescriptor[] = [];
  for (const subentry of distributionFs.readdirSync(entryFullPath)) {
    // not resolve directories
    const subentryFullPath = join(entryFullPath, subentry);
    if (noResolves.some((path) => subentryFullPath.startsWith(path))) continue;

    // not resolve non-directory entries
    if (!distributionFs.lstatSync(subentryFullPath, { throwIfNoEntry: false })?.isDirectory())
      continue;

    // check if entry is instance
    const isInstance = distributionFs.existsSync(join(subentryFullPath, JAVASCRIPT_FILENAME));
    let child: ChapterDescriptor;
    if (isInstance) {
      child = await resolveInstance(join(entry, subentry));
    } else {
      child = await resolveDirectory(noResolves, join(entry, subentry));
    }

    children.push(child);
  }

  // sort children which contains zIndex, all children which has no zIndex append to last in original order
  const { zIndexChildren, nonZIndexChildren } = children.reduce(
    (result, child) => {
      if (typeof child.zIndex === "number") {
        result.zIndexChildren.push(child);
      } else {
        result.nonZIndexChildren.push(child);
      }

      return result;
    },
    {
      zIndexChildren: [] as ChapterDescriptor[],
      nonZIndexChildren: [] as ChapterDescriptor[],
    }
  );
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  zIndexChildren.sort((a, b) => a.zIndex! - b.zIndex!);
  const sortedChildren = [...zIndexChildren, ...nonZIndexChildren];

  return {
    zIndex: zIndex,
    type: ChapterDescriptorType.Directory,
    entry: basename(entry),
    children: sortedChildren,
    title: title ?? entry,
    intro,
  } as ChapterDirectory;
};

/**
 * Resolve prelude information.
 * @param hint Hint information
 */
export const resolvePrelude = async ({ noResolvesInDistribution, imports }: Hint) => {
  const descriptors = (await resolveDirectory(noResolvesInDistribution)).children;
  const prelude: Prelude = {
    descriptors,
    imports,
  };

  distributionFs.writeFileSync(
    join(DISTRIBUTION_DIRECTORY_PATH, DISTRIBUTION_PRELUDE_FILENAME),
    JSON.stringify(prelude),
    "utf-8"
  );
};
