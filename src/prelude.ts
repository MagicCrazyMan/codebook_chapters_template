import { basename, extname, join, resolve as resolvePath } from "node:path";
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
 * Chapter descriptor type
 */
enum ChapterDescriptorType {
  /**
   * Introduction chapter, with code and canvas zone hidden
   */
  Intro = "intro",
  /**
   * Code example chapter, with code and canvas zone shown
   */
  Code = "code",
  /**
   * Directory entry
   */
  Directory = "dir",
}

/**
 * Chapter introduction
 */
type ChapterIntroduction = {
  type: ChapterDescriptorType;
  zIndex?: number;
  title?: string;
  intro?: string;
};

/**
 * Chapter descriptor
 */
type ChapterDescriptor = ChapterInstance | ChapterDirectory;

/**
 * Chapter instance
 */
type ChapterInstance = {
  zIndex?: number;
  type: ChapterDescriptorType.Code | ChapterDescriptorType.Intro;
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
 * @param introduction Introduction of the directory, if not provided, read from `index.json` under current entry automatically.
 * @returns Chapter instance
 */
const resolveInstance = async (entry: string, introduction = readIntroduction(entry)) => {
  const { type, title, intro, zIndex } = introduction;

  const entryFullPath = resolvePath(DISTRIBUTION_DIRECTORY_PATH, entry);
  let hasHTML: boolean;
  let hasStylesheet: boolean;
  let hasDescription: boolean;
  let hasPreviewImage: boolean;
  let libs: string[];
  if (type === ChapterDescriptorType.Code) {
    hasHTML = distributionFs.existsSync(join(entryFullPath, HTML_FILENAME));
    hasStylesheet = distributionFs.existsSync(join(entryFullPath, STYLESHEET_FILENAME));
    hasDescription = distributionFs.existsSync(join(entryFullPath, DESCRIPTION_FILENAME));
    hasPreviewImage = distributionFs.existsSync(join(entryFullPath, PREVIEW_IMAGE_FILENAME));
    libs = await collectLocalImports(entry);
  } else {
    hasHTML = false;
    hasStylesheet = false;
    hasDescription = distributionFs.existsSync(join(entryFullPath, DESCRIPTION_FILENAME));
    hasPreviewImage = false;
    libs = [];
  }

  return {
    zIndex,
    type,
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
 * @param noResolves Directories that only copy
 * @param entry Entry, relative path
 * @param introduction Introduction of the directory, if not provided, read from `index.json` under current entry automatically.
 * @returns Chapter instance
 */
const resolveDirectory = async (
  noResolves: string[],
  entry = "",
  introduction = readIntroduction(entry)
) => {
  const { title, intro, zIndex } = introduction;

  // iterate entries and resolve
  const entryFullPath = resolvePath(DISTRIBUTION_DIRECTORY_PATH, entry);
  const children: ChapterDescriptor[] = [];
  for (const subentry of distributionFs.readdirSync(entryFullPath)) {
    const subentryFullPath = join(entryFullPath, subentry);
    const subentryRelativePath = join(entry, subentry);
    // not resolve directories
    if (noResolves.some((path) => subentryFullPath.startsWith(path))) continue;

    // not resolve non-directory entries
    if (!distributionFs.lstatSync(subentryFullPath, { throwIfNoEntry: false })?.isDirectory())
      continue;

    // read child introduction
    const childIntroduction = readIntroduction(subentryRelativePath);

    let child: ChapterDescriptor;
    if (
      childIntroduction.type === ChapterDescriptorType.Code ||
      childIntroduction.type === ChapterDescriptorType.Intro
    ) {
      child = await resolveInstance(subentryRelativePath, childIntroduction);
    } else if (childIntroduction.type === ChapterDescriptorType.Directory) {
      child = await resolveDirectory(noResolves, subentryRelativePath, childIntroduction);
    } else {
      throw new Error(`unknown type ${childIntroduction.type} in entry ${subentryRelativePath}`);
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
