import { dirname, extname, join, resolve as resolvePath } from "node:path";
import parseImports from "parse-imports";
import imports from "./imports.json" assert { type: "json" };
import {
  DESCRIPTION_FILENAME,
  DISTRIBUTION_DIRECTORY_PATH,
  HTML_FILENAME,
  INTRODUCTION_FILENAME,
  JAVASCRIPT_FILENAME,
  LIBS_DIRECTORY_NAME,
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
 * @param path Path of chapter instance directory
 * @returns ChapterIntroduction
 */
const readIntroduction = (path: string) => {
  // read introduction
  const introPath = join(path, INTRODUCTION_FILENAME);
  if (distributionFs.existsSync(introPath)) {
    if (distributionFs.lstatSync(introPath).isFile()) {
      return JSON.parse(distributionFs.readFileSync(introPath, "utf-8")) as ChapterIntroduction;
    }
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
 * @param fullPath Full path of entry directory
 * @returns collection of local libs
 */
const collectLocalImports = async (fullPath: string) => {
  const scripts = [
    {
      code: distributionFs.readFileSync(join(fullPath, JAVASCRIPT_FILENAME), "utf-8"),
      fullPath: join(fullPath, JAVASCRIPT_FILENAME),
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

      // add library script recursively
      const libPath = join(dirname(fullPath), lib);
      scripts.push({
        code: distributionFs.readFileSync(libPath, "utf-8"),
        fullPath: libPath,
      });
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
 * @param entry Entry name
 * @param fullPath Full path of entry directory
 * @returns Chapter instance
 */
const resolveInstance = async (entry: string, fullPath: string) => {
  // read introduction
  const { title, intro, zIndex } = readIntroduction(fullPath);

  const hasHTML = distributionFs.existsSync(join(fullPath, HTML_FILENAME));
  const hasStylesheet = distributionFs.existsSync(join(fullPath, STYLESHEET_FILENAME));
  const hasDescription = distributionFs.existsSync(join(fullPath, DESCRIPTION_FILENAME));
  const hasPreviewImage = distributionFs.existsSync(join(fullPath, PREVIEW_IMAGE_FILENAME));
  const libs = await collectLocalImports(fullPath);

  return {
    zIndex,
    type: ChapterDescriptorType.Instance,
    entry,
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
 * @param entry Entry name
 * @param fullPath Full path of entry directory
 * @param isRoot Is root directory, if it is root directory, LIBS_DIRECTORY_NAME will be ignored
 * @returns Chapter instance
 */
const resolveDirectory = async (entry: string, fullPath: string, isRoot: boolean) => {
  // read introduction
  const { title, intro, zIndex } = readIntroduction(fullPath);

  // iterate entries and resolve
  const children: ChapterDescriptor[] = [];
  for (const subentry of distributionFs.readdirSync(fullPath)) {
    if (isRoot && subentry === LIBS_DIRECTORY_NAME) continue;
    if (!distributionFs.lstatSync(join(fullPath, subentry)).isDirectory()) continue;

    const isInstance = distributionFs.existsSync(join(fullPath, subentry, JAVASCRIPT_FILENAME));

    let child: ChapterDescriptor;
    if (isInstance) {
      child = await resolveInstance(subentry, join(fullPath, subentry));
    } else {
      child = await resolveDirectory(subentry, join(fullPath, subentry), false);
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
    entry,
    children: sortedChildren,
    title: title ?? entry,
    intro,
  } as ChapterDirectory;
};

/**
 * Resolve prelude information.
 */
export const resolvePrelude = async () => {
  const descriptors = (await resolveDirectory("", resolvePath(DISTRIBUTION_DIRECTORY_PATH), true))
    .children;
  const prelude: Prelude = {
    descriptors,
    imports,
  };

  distributionFs.writeFileSync(
    join(DISTRIBUTION_DIRECTORY_PATH, INTRODUCTION_FILENAME),
    JSON.stringify(prelude),
    "utf-8"
  );
};
