import { copyFile, lstat, mkdir, readFile, readdir, realpath, rm, stat, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

import matter from "gray-matter";
import { slug as slugify } from "github-slugger";

const projectRoot = process.cwd();
const vaultRoot = path.resolve(projectRoot, "posts");
const quartzContentRoot = path.resolve(projectRoot, ".quartz-content");
const generatedManifestPath = path.resolve(projectRoot, "src", "generated", "published-content.json");
const checkOnly = process.argv.includes("--check");

const DEFAULT_LOCALE = "zh";
const LOCALES = {
  zh: { htmlLang: "zh-CN" },
  en: { htmlLang: "en-US" },
};
const MARKDOWN_EXTENSION = /\.mdx?$/i;
const FALLBACK_LINK_ORIGIN = "https://one-blog.local";
const ALLOWED_ASSET_EXTENSIONS = new Set([
  ".avif", ".gif", ".ico", ".jpeg", ".jpg", ".m4a", ".mov", ".mp3", ".mp4",
  ".ogg", ".pdf", ".png", ".svg", ".wav", ".webm", ".webp",
]);
const SKIPPED_DIRECTORIES = new Set([".git", ".obsidian", "node_modules"]);

function toPosix(relativePath) {
  return relativePath.split(path.sep).join("/");
}

function stripMarkdownExtension(filePath) {
  return filePath.replace(MARKDOWN_EXTENSION, "");
}

function assertInside(root, candidate, label) {
  const rootPrefix = path.resolve(root).replace(/[\\/]+$/, "") + path.sep;
  const resolved = path.resolve(candidate);
  if (resolved !== path.resolve(root) && !resolved.startsWith(rootPrefix)) {
    throw new Error(`${label} escapes its allowed root: ${candidate}`);
  }
  return resolved;
}

function hasStrictPublishOptIn(source) {
  const normalized = source.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n");
  const frontmatter = normalized.match(/^---[ \t]*\n([\s\S]*?)\n---[ \t]*(?:\n|$)/);
  if (!frontmatter) return false;
  return /^publish:[ \t]*true[ \t]*(?:#.*)?$/m.test(frontmatter[1]);
}

async function walkFiles(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (SKIPPED_DIRECTORIES.has(entry.name)) continue;
    const absolutePath = path.join(directory, entry.name);
    const entryStats = await lstat(absolutePath);
    if (entryStats.isSymbolicLink()) continue;
    if (entryStats.isDirectory()) files.push(...(await walkFiles(absolutePath)));
    else if (entryStats.isFile()) files.push(absolutePath);
  }
  return files;
}

function asOptionalString(value) {
  return typeof value === "string" && value.trim() !== "" ? value.trim() : undefined;
}

function normalizeLocale(value, relativePath) {
  const declared = asOptionalString(value)?.toLowerCase();
  if (!declared) {
    throw new Error(`Published note ${relativePath} must declare lang: zh-CN or lang: en-US`);
  }
  if (declared === "zh" || declared === "zh-cn") return "zh";
  if (declared === "en" || declared === "en-us") return "en";
  throw new Error(`Published note ${relativePath} has unsupported lang: ${value}`);
}

function normalizeDate(data, fallbackDate) {
  const candidate = data.date ?? data.published ?? data.created;
  if (candidate instanceof Date && !Number.isNaN(candidate.getTime())) return candidate.toISOString();
  if (typeof candidate === "string" || typeof candidate === "number") {
    const parsed = new Date(candidate);
    if (!Number.isNaN(parsed.getTime())) return String(candidate);
  }
  return fallbackDate.toISOString();
}

function stripMarkdown(value) {
  return value
    .replace(/%%[\s\S]*?%%/g, " ")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/!\[\[[^\]]+\]\]/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/\[\[([^\]|#]+)(?:#[^\]|]+)?(?:\|([^\]]+))?\]\]/g, "$2 $1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/[*_~`>|-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function deriveSummary(data, content) {
  const explicit = asOptionalString(data.summary) ?? asOptionalString(data.description);
  if (explicit) return explicit;
  const firstParagraph = content.split(/\n\s*\n/).map(stripMarkdown).find((paragraph) => paragraph.length > 0);
  if (!firstParagraph) return "";
  return firstParagraph.length > 180 ? `${firstParagraph.slice(0, 177)}...` : firstParagraph;
}

function normalizeTags(value) {
  if (Array.isArray(value)) return value.map(String).map((tag) => tag.trim()).filter(Boolean);
  if (typeof value === "string") return value.split(/[ ,]+/).map((tag) => tag.trim()).filter(Boolean);
  return [];
}

function deriveSlug(data, filePath, translationKey) {
  const fileName = path.basename(filePath).replace(MARKDOWN_EXTENSION, "");
  const isIndex = fileName.toLowerCase() === "index";
  const isVaultHomepage = isIndex && path.resolve(path.dirname(filePath)) === vaultRoot;
  const fallback = isVaultHomepage ? "home" : isIndex ? path.basename(path.dirname(filePath)) : fileName;
  const requested = asOptionalString(data.slug) ?? translationKey ?? fallback;
  const slug = slugify(requested.replace(/[\\/]+/g, "-"));
  if (!slug) throw new Error(`Unable to derive a public slug for ${filePath}`);
  return slug;
}

function slugifyQuartzPath(relativePath) {
  const withoutExtension = stripMarkdownExtension(relativePath).replace(/^\/+|\/+$/g, "");
  let slug = withoutExtension
    .split("/")
    .map((segment) => segment
      .replace(/\s/g, "-")
      .replace(/&/g, "-and-")
      .replace(/%/g, "-percent")
      .replace(/[?#]/g, "")
      .replace(/[<>:\"|*]/g, "")
      .toLowerCase())
    .join("/");
  if (slug.endsWith("_index")) slug = slug.replace(/_index$/, "index");
  const segments = slug.split("/");
  if (segments.length >= 2 && segments.at(-1) === segments.at(-2)) {
    segments[segments.length - 1] = "index";
    slug = segments.join("/");
  }
  return slug;
}

function quartzUrl(locale, quartzSlug) {
  return quartzSlug === "index" ? `/${locale}` : `/${locale}/${quartzSlug}`;
}

function extractAssetReferences(source, data) {
  const references = new Set();
  const add = (value) => {
    if (typeof value !== "string") return;
    const cleaned = value.trim().replace(/^<|>$/g, "");
    if (cleaned) references.add(cleaned);
  };
  for (const match of source.matchAll(/!\[\[([^\]]+)\]\]/g)) add(match[1].split("|")[0].split("#")[0]);
  for (const match of source.matchAll(/!?\[[^\]]*\]\(([^)]+)\)/g)) {
    const target = match[1].trim();
    add(target.startsWith("<") ? target.slice(1, target.indexOf(">")) : target.split(/\s+["']/)[0]);
  }
  for (const match of source.matchAll(/(?:src|poster)=["']([^"']+)["']/gi)) add(match[1]);
  for (const field of ["cover", "image", "socialImage", "banner"]) add(data[field]);
  return [...references];
}

function cleanAssetReference(reference) {
  if (/^(?:[a-z]+:|#|data:)/i.test(reference)) return undefined;
  const withoutQuery = reference.split(/[?#]/, 1)[0];
  try {
    return decodeURIComponent(withoutQuery).replace(/\\/g, "/");
  } catch {
    return withoutQuery.replace(/\\/g, "/");
  }
}

function assetReferenceKey(reference) {
  return cleanAssetReference(reference)?.toLowerCase();
}

async function resolveAsset(reference, notePath, allAssetsByBasename) {
  const cleaned = cleanAssetReference(reference);
  if (!cleaned || !ALLOWED_ASSET_EXTENSIONS.has(path.extname(cleaned).toLowerCase())) return undefined;
  const candidates = [];
  if (cleaned.startsWith("/")) candidates.push(path.join(vaultRoot, cleaned.slice(1)));
  else {
    candidates.push(path.resolve(path.dirname(notePath), cleaned));
    candidates.push(path.resolve(vaultRoot, cleaned));
  }
  const basenameMatches = allAssetsByBasename.get(path.basename(cleaned).toLowerCase()) ?? [];
  if (basenameMatches.length === 1) candidates.push(basenameMatches[0]);
  for (const candidate of candidates) {
    const safeCandidate = assertInside(vaultRoot, candidate, "Asset reference");
    try {
      const candidateStats = await lstat(safeCandidate);
      if (!candidateStats.isFile() || candidateStats.isSymbolicLink()) continue;
      const canonical = await realpath(safeCandidate);
      assertInside(vaultRoot, canonical, "Resolved asset");
      return canonical;
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
    }
  }
  return undefined;
}

function createNoteIndex(markdownFiles) {
  const records = markdownFiles.map((filePath) => {
    const relativePath = toPosix(path.relative(vaultRoot, filePath));
    const stem = stripMarkdownExtension(relativePath);
    return {
      filePath,
      relativePath,
      stem,
      lowerStem: stem.toLowerCase(),
      basename: path.posix.basename(stem).toLowerCase(),
    };
  });
  const byStem = new Map(records.map((record) => [record.lowerStem, record]));
  const byBasename = new Map();
  for (const record of records) byBasename.set(record.basename, [...(byBasename.get(record.basename) ?? []), record]);
  return { records, byStem, byBasename };
}

function resolveNoteTarget(rawTarget, sourceRelativePath, noteIndex) {
  if (!rawTarget || /^(?:[a-z]+:|#)/i.test(rawTarget)) return undefined;
  let decoded;
  try {
    decoded = decodeURIComponent(rawTarget);
  } catch {
    decoded = rawTarget;
  }
  const target = stripMarkdownExtension(decoded.replace(/\\/g, "/").replace(/^\/+/, ""));
  const sourceDirectory = path.posix.dirname(stripMarkdownExtension(sourceRelativePath));
  const candidates = [
    path.posix.normalize(path.posix.join(sourceDirectory, target)).replace(/^\.\//, ""),
    path.posix.normalize(target).replace(/^\.\//, ""),
  ];
  for (const candidate of candidates) {
    const match = noteIndex.byStem.get(candidate.toLowerCase());
    if (match) return match;
  }
  const suffixMatches = noteIndex.records.filter(
    (record) => record.lowerStem === target.toLowerCase() || record.lowerStem.endsWith(`/${target.toLowerCase()}`),
  );
  if (suffixMatches.length === 1) return suffixMatches[0];
  const basenameMatches = noteIndex.byBasename.get(path.posix.basename(target).toLowerCase()) ?? [];
  return basenameMatches.length === 1 ? basenameMatches[0] : undefined;
}

function splitWikilink(inner) {
  const pipeIndex = inner.indexOf("|");
  const targetWithAnchor = pipeIndex === -1 ? inner : inner.slice(0, pipeIndex);
  const alias = pipeIndex === -1 ? undefined : inner.slice(pipeIndex + 1);
  const hashIndex = targetWithAnchor.indexOf("#");
  const target = hashIndex === -1 ? targetWithAnchor : targetWithAnchor.slice(0, hashIndex);
  const anchor = hashIndex === -1 ? "" : targetWithAnchor.slice(hashIndex);
  return { target: target.trim(), anchor, alias: alias?.trim() };
}

function localizedAssetPath(entry, assetRelativePath) {
  const fromDirectory = path.posix.dirname(entry.quartzRelativePath);
  const relative = path.posix.relative(fromDirectory === "." ? "" : fromDirectory, assetRelativePath);
  return relative || path.posix.basename(assetRelativePath);
}

function rewriteAssetReferences(content, entry) {
  const findTarget = (reference) => entry.assetTargets.get(assetReferenceKey(reference));
  let rewritten = content.replace(/!\[\[([^\]]+)\]\]/g, (original, inner) => {
    const pipeIndex = inner.indexOf("|");
    const targetWithAnchor = pipeIndex === -1 ? inner : inner.slice(0, pipeIndex);
    const suffix = pipeIndex === -1 ? "" : inner.slice(pipeIndex);
    const hashIndex = targetWithAnchor.indexOf("#");
    const target = hashIndex === -1 ? targetWithAnchor : targetWithAnchor.slice(0, hashIndex);
    const anchor = hashIndex === -1 ? "" : targetWithAnchor.slice(hashIndex);
    const assetRelativePath = findTarget(target);
    if (!assetRelativePath) return original;
    return `![[${localizedAssetPath(entry, assetRelativePath)}${anchor}${suffix}]]`;
  });
  rewritten = rewritten.replace(
    /(!?\[[^\]]*\]\()(<[^>]+>|[^)\s]+)([^)]*\))/g,
    (original, prefix, rawTarget, suffix) => {
      const target = rawTarget.startsWith("<") ? rawTarget.slice(1, -1) : rawTarget;
      const assetRelativePath = findTarget(target);
      if (!assetRelativePath) return original;
      return `${prefix}${encodeURI(localizedAssetPath(entry, assetRelativePath))}${suffix}`;
    },
  );
  return rewritten.replace(/((?:src|poster)=["'])([^"']+)(["'])/gi, (original, prefix, target, suffix) => {
    const assetRelativePath = findTarget(target);
    if (!assetRelativePath) return original;
    return `${prefix}${encodeURI(localizedAssetPath(entry, assetRelativePath))}${suffix}`;
  });
}

function rewriteWikilinks(content, entry, context, mode) {
  return content.replace(/(!?)\[\[([^\]]+)\]\]/g, (original, embed, inner) => {
    const { target, anchor, alias } = splitWikilink(inner);
    const resolved = resolveNoteTarget(target, entry.relativePath, context.noteIndex);
    if (!resolved) return original;
    const publishedTarget = context.publishedBySourceStem.get(resolved.lowerStem);
    if (!publishedTarget) return alias ?? path.posix.basename(target);
    const group = context.postsByTranslationKey.get(publishedTarget.translationKey) ?? [];
    const localizedTarget = group.find((candidate) => candidate.lang === entry.lang);
    const label = (alias ?? publishedTarget.title ?? path.posix.basename(target)).replace(/[\[\]]/g, "");
    if (localizedTarget) {
      if (mode === "next") return `[${label}](${localizedTarget.url}${anchor})`;
      const quartzTarget = stripMarkdownExtension(localizedTarget.quartzRelativePath);
      return `${embed}[[${quartzTarget}${anchor}${alias ? `|${alias}` : ""}]]`;
    }
    const fallback = group.find((candidate) => candidate.lang === DEFAULT_LOCALE) ?? publishedTarget;
    const missingLabel = entry.lang === "en" ? "Chinese only" : "仅有英文版";
    const targetUrl = mode === "next" ? fallback.url : `${FALLBACK_LINK_ORIGIN}${fallback.quartzUrl}`;
    return `[${label} (${missingLabel})](${targetUrl}${anchor})`;
  });
}

function splitFrontmatter(source) {
  const match = source.match(/^(?:\uFEFF)?---[ \t]*\r?\n[\s\S]*?\r?\n---[ \t]*(?:\r?\n|$)/);
  if (!match) return { header: "", body: source };
  return { header: match[0], body: source.slice(match[0].length) };
}

function rewriteQuartzSource(entry, context) {
  const { header, body } = splitFrontmatter(entry.source);
  const localizedAssets = rewriteAssetReferences(body, entry);
  return `${header}${rewriteWikilinks(localizedAssets, entry, context, "quartz")}`;
}

function publicPost(entry) {
  return {
    title: entry.title,
    summary: entry.summary,
    date: entry.date,
    lang: entry.lang,
    htmlLang: entry.htmlLang,
    translationKey: entry.translationKey,
    publish: true,
    tags: entry.tags,
    slug: entry.slug,
    path: entry.relativePath,
    url: entry.url,
    quartzSlug: entry.quartzSlug,
    quartzUrl: entry.quartzUrl,
    content: entry.content,
  };
}

async function buildPublication() {
  const allFiles = await walkFiles(vaultRoot);
  const markdownFiles = allFiles.filter((filePath) => MARKDOWN_EXTENSION.test(filePath));
  const noteIndex = createNoteIndex(markdownFiles);
  const assets = allFiles.filter((filePath) => ALLOWED_ASSET_EXTENSIONS.has(path.extname(filePath).toLowerCase()));
  const assetsByBasename = new Map();
  for (const asset of assets) {
    const key = path.basename(asset).toLowerCase();
    assetsByBasename.set(key, [...(assetsByBasename.get(key) ?? []), asset]);
  }

  const entries = [];
  const referencedAssetsByLang = new Map(Object.keys(LOCALES).map((locale) => [locale, new Set()]));
  for (const filePath of markdownFiles) {
    const source = await readFile(filePath, "utf8");
    if (!hasStrictPublishOptIn(source)) continue;
    let parsed;
    try {
      parsed = matter(source);
    } catch (error) {
      throw new Error(`Invalid frontmatter in opted-in note ${toPosix(path.relative(vaultRoot, filePath))}: ${error.message}`);
    }
    if (parsed.data.publish !== true) continue;
    const relativePath = toPosix(path.relative(vaultRoot, filePath));
    const fileStats = await stat(filePath);
    const lang = normalizeLocale(parsed.data.lang, relativePath);
    const translationKey = asOptionalString(parsed.data.translationKey);
    if (!translationKey) throw new Error(`Published note ${relativePath} must declare a stable translationKey`);
    const title = asOptionalString(parsed.data.title) ?? path.basename(filePath).replace(MARKDOWN_EXTENSION, "");
    const slug = deriveSlug(parsed.data, filePath, translationKey);
    const entry = {
      filePath,
      relativePath,
      source,
      rawContent: parsed.content.trim(),
      title,
      summary: deriveSummary(parsed.data, parsed.content),
      date: normalizeDate(parsed.data, fileStats.mtime),
      lang,
      htmlLang: LOCALES[lang].htmlLang,
      translationKey,
      tags: normalizeTags(parsed.data.tags),
      slug,
      url: `/${lang}/posts/${slug}`,
      assetTargets: new Map(),
    };
    entries.push(entry);
    for (const reference of extractAssetReferences(source, parsed.data)) {
      const resolved = await resolveAsset(reference, filePath, assetsByBasename);
      if (resolved) {
        referencedAssetsByLang.get(lang).add(resolved);
        entry.assetTargets.set(assetReferenceKey(reference), toPosix(path.relative(vaultRoot, resolved)));
      }
    }
  }

  const publishedBySourceStem = new Map();
  const translationKeys = new Map();
  for (const entry of entries) {
    publishedBySourceStem.set(stripMarkdownExtension(entry.relativePath).toLowerCase(), entry);
    const translationLocaleKey = `${entry.lang}:${entry.translationKey}`;
    if (translationKeys.has(translationLocaleKey)) {
      throw new Error(`Duplicate translationKey ${translationLocaleKey}: ${translationKeys.get(translationLocaleKey)} and ${entry.relativePath}`);
    }
    translationKeys.set(translationLocaleKey, entry.relativePath);
  }

  const postsByTranslationKey = new Map();
  for (const entry of entries) {
    postsByTranslationKey.set(entry.translationKey, [...(postsByTranslationKey.get(entry.translationKey) ?? []), entry]);
  }
  const routeKeys = new Map();
  for (const [translationKey, group] of postsByTranslationKey) {
    const canonical = group.find((entry) => entry.lang === DEFAULT_LOCALE)
      ?? [...group].sort((left, right) => left.relativePath.localeCompare(right.relativePath))[0];
    const canonicalIsHomepage = canonical.relativePath.toLowerCase() === "index.md";
    const keySlug = slugify(translationKey.replace(/[\\/]+/g, "-"));
    if (!keySlug) throw new Error(`Unable to derive a Quartz route from translationKey: ${translationKey}`);
    const routeDirectory = path.posix.dirname(canonical.relativePath);
    const quartzRelativePath = canonicalIsHomepage
      ? "index.md"
      : path.posix.join(routeDirectory === "." ? "" : routeDirectory, `${keySlug}.md`);
    const quartzSlug = slugifyQuartzPath(quartzRelativePath);
    for (const entry of group) {
      entry.quartzRelativePath = quartzRelativePath;
      entry.quartzSlug = quartzSlug;
      entry.quartzUrl = quartzUrl(entry.lang, quartzSlug);
      const routeKey = `${entry.lang}:${quartzSlug}`;
      if (routeKeys.has(routeKey)) {
        throw new Error(`Duplicate Quartz route ${routeKey}: ${routeKeys.get(routeKey)} and ${entry.relativePath}`);
      }
      routeKeys.set(routeKey, entry.relativePath);
    }
  }

  const context = { noteIndex, publishedBySourceStem, postsByTranslationKey };
  for (const entry of entries) {
    entry.content = rewriteWikilinks(entry.rawContent, entry, context, "next");
    entry.quartzSource = rewriteQuartzSource(entry, context);
  }

  const posts = entries.map(publicPost);
  posts.sort((left, right) => Date.parse(right.date) - Date.parse(left.date) || left.path.localeCompare(right.path));
  const translations = {};
  for (const post of posts) {
    translations[post.translationKey] ??= {};
    translations[post.translationKey][post.lang] = { path: post.path, url: post.url, quartzUrl: post.quartzUrl };
  }
  const warnings = [];
  for (const [translationKey, group] of postsByTranslationKey) {
    const missing = Object.keys(LOCALES).filter((locale) => !group.some((entry) => entry.lang === locale));
    if (missing.length > 0) warnings.push(`${translationKey} is missing: ${missing.join(", ")}`);
  }
  return {
    manifest: {
      schemaVersion: 2,
      defaultLocale: DEFAULT_LOCALE,
      locales: Object.keys(LOCALES),
      translations,
      posts,
    },
    entries,
    referencedAssetsByLang,
    warnings,
  };
}

async function writePublication({ manifest, entries, referencedAssetsByLang }) {
  const expectedQuartzRoot = path.resolve(projectRoot, ".quartz-content");
  if (quartzContentRoot !== expectedQuartzRoot) {
    throw new Error(`Refusing to replace unexpected Quartz content directory: ${quartzContentRoot}`);
  }
  await rm(quartzContentRoot, { recursive: true, force: true });
  await mkdir(quartzContentRoot, { recursive: true });
  for (const locale of Object.keys(LOCALES)) {
    const localeRoot = assertInside(quartzContentRoot, path.join(quartzContentRoot, locale), "Quartz locale root");
    await mkdir(localeRoot, { recursive: true });
    for (const entry of entries.filter((candidate) => candidate.lang === locale)) {
      const destination = assertInside(localeRoot, path.join(localeRoot, entry.quartzRelativePath), "Published note");
      await mkdir(path.dirname(destination), { recursive: true });
      await writeFile(destination, entry.quartzSource, "utf8");
    }
    for (const asset of referencedAssetsByLang.get(locale)) {
      const relativePath = path.relative(vaultRoot, asset);
      const destination = assertInside(localeRoot, path.join(localeRoot, relativePath), "Published asset");
      await mkdir(path.dirname(destination), { recursive: true });
      await copyFile(asset, destination);
    }
    const hasPublishedIndex = entries.some((entry) => entry.lang === locale && entry.quartzSlug === "index");
    if (!hasPublishedIndex) {
      const body = locale === "en"
        ? "# One Blog\n\nThere are no published homepage notes in English yet."
        : "# One Blog\n\n当前还没有已发布的中文首页笔记。";
      await writeFile(
        path.join(localeRoot, "index.md"),
        `---\ntitle: One Blog\npublish: true\nlang: ${LOCALES[locale].htmlLang}\ntranslationKey: generated-home-${locale}\n---\n\n${body}\n`,
        "utf8",
      );
    }
  }
  await mkdir(path.dirname(generatedManifestPath), { recursive: true });
  await writeFile(generatedManifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
}

async function useGeneratedPublication(reason) {
  const existing = await readFile(generatedManifestPath, "utf8").catch(() => undefined);
  if (!existing) return false;
  const parsed = JSON.parse(existing);
  if (!Array.isArray(parsed.posts)) throw new Error("The generated publication manifest is invalid.");
  console.log(`${reason}; using ${parsed.posts.length} pre-generated published note(s).`);
  return true;
}

if (!existsSync(vaultRoot)) {
  if (!(await useGeneratedPublication("Vault unavailable"))) {
    throw new Error("The vault is unavailable and no generated publication manifest exists.");
  }
  process.exit(0);
}

const publication = await buildPublication();
// Vercel CLI intentionally excludes the private vault from source uploads. It
// may still materialize the empty submodule directory, so presence alone is not
// enough to distinguish that safe build input from a genuinely empty vault.
if (process.env.VERCEL && publication.manifest.posts.length === 0) {
  if (await useGeneratedPublication("Vault excluded from Vercel source upload")) process.exit(0);
}
const serializedManifest = `${JSON.stringify(publication.manifest, null, 2)}\n`;
if (checkOnly) {
  const existing = await readFile(generatedManifestPath, "utf8").catch(() => undefined);
  if (!existing) throw new Error("Published content manifest is missing. Run npm run content:prepare.");
  if (existing !== serializedManifest) throw new Error("Published content manifest is stale. Run npm run content:prepare.");
} else {
  await writePublication(publication);
}

const referencedAssetCount = new Set(
  [...publication.referencedAssetsByLang.values()].flatMap((assets) => [...assets]),
).size;
console.log(`${checkOnly ? "Verified" : "Prepared"} ${publication.manifest.posts.length} published note(s) and ${referencedAssetCount} referenced asset(s).`);
for (const post of publication.manifest.posts) console.log(`- [${post.lang}] ${post.path} -> ${post.quartzUrl}`);
for (const warning of publication.warnings) console.warn(`Warning: ${warning}`);
