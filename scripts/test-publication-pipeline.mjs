import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const prepareScript = path.join(repositoryRoot, "scripts", "prepare-published-content.mjs");
const postprocessScript = path.join(repositoryRoot, "scripts", "postprocess-quartz-i18n.mjs");
const temporaryBase = path.resolve(tmpdir());
const temporaryRoot = await mkdtemp(path.join(temporaryBase, "one-blog-publication-"));

function runPrepare() {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [prepareScript], {
      cwd: temporaryRoot,
      stdio: "inherit",
      shell: false,
    });
    child.once("error", reject);
    child.once("exit", (code, signal) => {
      if (code === 0) resolve();
      else reject(new Error(`Publication fixture build exited with ${code ?? signal}`));
    });
  });
}

function runPostprocess(locale, outputRoot) {
  return new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      [postprocessScript, locale, outputRoot, "https://example.test", "https://refine.example.test"],
      { cwd: temporaryRoot, stdio: "inherit", shell: false },
    );
    child.once("error", reject);
    child.once("exit", (code, signal) => {
      if (code === 0) resolve();
      else reject(new Error(`Quartz postprocessor fixture exited with ${code ?? signal}`));
    });
  });
}

function expectPrepareFailure(pattern) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [prepareScript], {
      cwd: temporaryRoot,
      stdio: ["ignore", "pipe", "pipe"],
      shell: false,
    });
    let output = "";
    child.stdout.on("data", (chunk) => { output += chunk.toString(); });
    child.stderr.on("data", (chunk) => { output += chunk.toString(); });
    child.once("error", reject);
    child.once("exit", (code) => {
      if (code === 0) {
        reject(new Error(`Expected publication validation to fail with ${pattern}`));
        return;
      }
      try {
        assert.match(output, pattern);
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  });
}

try {
  const vault = path.join(temporaryRoot, "posts");
  await mkdir(path.join(vault, "Projects"), { recursive: true });
  await mkdir(path.join(vault, "Areas"), { recursive: true });
  await writeFile(
    path.join(vault, "Projects", "topic-cn.md"),
    "---\r\ntitle: 中文主题\r\npublish: true\r\nlang: zh-CN\r\ntranslationKey: topic\r\n---\r\n\r\n正文。\r\n\r\n返回 [[Projects/topic-cn|中文主题]]。\r\n\r\n![[image.png]]\r\n",
  );
  await writeFile(
    path.join(vault, "Areas", "topic-en.md"),
    "---\ntitle: Topic\npublish: true\nlang: en-US\ntranslationKey: topic\n---\n\nBody. See [[Projects/chinese-only|Chinese reference]].\n",
  );
  await writeFile(
    path.join(vault, "Projects", "chinese-only.md"),
    "---\ntitle: 仅中文\npublish: true\nlang: zh-CN\ntranslationKey: chinese-only\n---\n\n只有中文。\n",
  );
  await writeFile(path.join(vault, "quoted.md"), "---\npublish: \"true\"\n---\n\nPrivate.\n");
  await writeFile(path.join(vault, "publisher.md"), "---\npublish:\n  - Example Press\n---\n\nPrivate.\n");
  await writeFile(path.join(vault, "image.png"), "referenced");
  await writeFile(path.join(vault, "unused.png"), "private");

  await runPrepare();

  const manifest = JSON.parse(
    await readFile(path.join(temporaryRoot, "src", "generated", "published-content.json"), "utf8"),
  );
  assert.equal(manifest.schemaVersion, 2);
  assert.equal(manifest.posts.length, 3);
  assert.deepEqual(new Set(manifest.posts.map((post) => post.path)), new Set([
    "Areas/topic-en.md",
    "Projects/chinese-only.md",
    "Projects/topic-cn.md",
  ]));
  assert.deepEqual(new Set(manifest.posts.map((post) => post.slug)), new Set(["chinese-only", "topic"]));
  assert.deepEqual(new Set(manifest.posts.map((post) => post.quartzUrl)), new Set([
    "/zh/projects/topic",
    "/en/projects/topic",
    "/zh/projects/chinese-only",
  ]));
  const chineseQuartz = await readFile(
    path.join(temporaryRoot, ".quartz-content", "zh", "Projects", "topic.md"),
    "utf8",
  );
  const englishQuartz = await readFile(
    path.join(temporaryRoot, ".quartz-content", "en", "Projects", "topic.md"),
    "utf8",
  );
  assert.match(chineseQuartz, /\[\[Projects\/topic\|中文主题\]\]/);
  assert.match(chineseQuartz, /!\[\[\.\.\/image\.png\]\]/);
  assert.doesNotMatch(chineseQuartz, /Translations|译文/);
  assert.match(englishQuartz, /Body\./);
  assert.match(englishQuartz, /\[Chinese reference \(Chinese only\)\]\(https:\/\/one-blog\.local\/zh\/projects\/chinese-only\)/);
  await readFile(path.join(temporaryRoot, ".quartz-content", "zh", "image.png"));
  await assert.rejects(readFile(path.join(temporaryRoot, ".quartz-content", "en", "image.png")));
  await assert.rejects(
    readFile(path.join(temporaryRoot, ".quartz-content", "en", "Projects", "chinese-only.md")),
  );
  await assert.rejects(readFile(path.join(temporaryRoot, ".quartz-content", "zh", "unused.png")));
  await assert.rejects(readFile(path.join(temporaryRoot, ".quartz-content", "zh", "quoted.md")));

  const chineseOutputRoot = path.join(temporaryRoot, ".quartz-output", "zh");
  await mkdir(path.join(chineseOutputRoot, "projects"), { recursive: true });
  await writeFile(
    path.join(chineseOutputRoot, "projects", "chinese-only.html"),
    "<!doctype html><html><head></head><body><main>仅中文</main><footer><ul><li><a href=\"https://refine.example.test\">Refine 版</a></li></ul></footer></body></html>",
  );
  await runPostprocess("zh", chineseOutputRoot);
  const missingTranslationHtml = await readFile(
    path.join(chineseOutputRoot, "projects", "chinese-only.html"),
    "utf8",
  );
  assert.match(
    missingTranslationHtml,
    /href="\/en\?translation=missing&amp;from=chinese-only"[^>]*data-router-ignore/,
  );
  assert.match(
    missingTranslationHtml,
    /<footer>[\s\S]*id="one-blog-peer-link" href="https:\/\/refine\.example\.test"[^>]*rel="friend noopener noreferrer"[\s\S]*<\/footer>/,
  );
  const languageNavigation = missingTranslationHtml.match(
    /<nav id="one-blog-language-switcher"[\s\S]*?<\/nav>/,
  )?.[0];
  assert.ok(languageNavigation);
  assert.match(languageNavigation, /class="one-blog-language-shell"/);
  assert.match(languageNavigation, /aria-current="page"[^>]*>中<\/span>/);
  assert.match(languageNavigation, /aria-label="English"[^>]*>EN<\/a>/);
  assert.doesNotMatch(languageNavigation, /one-blog-peer-link/);
  const languageClient = await readFile(
    path.join(chineseOutputRoot, "static", "one-blog-i18n.js"),
    "utf8",
  );
  assert.match(languageClient, /This article is not available in English yet/);
  assert.match(languageClient, /这篇文章暂时没有中文版/);

  const missingLangPath = path.join(vault, "missing-lang.md");
  await writeFile(missingLangPath, "---\npublish: true\ntranslationKey: invalid\n---\n\nInvalid.\n");
  await expectPrepareFailure(/must declare lang: zh-CN or lang: en-US/);
  await rm(missingLangPath);

  const missingKeyPath = path.join(vault, "missing-key.md");
  await writeFile(missingKeyPath, "---\npublish: true\nlang: en-US\n---\n\nInvalid.\n");
  await expectPrepareFailure(/must declare a stable translationKey/);
  await rm(missingKeyPath);

  const duplicateKeyPath = path.join(vault, "duplicate-key.md");
  await writeFile(
    duplicateKeyPath,
    "---\npublish: true\nlang: en-US\ntranslationKey: topic\n---\n\nDuplicate.\n",
  );
  await expectPrepareFailure(/Duplicate translationKey en:topic/);
  await rm(duplicateKeyPath);
  console.log("Publication pipeline fixture passed.");
} finally {
  const temporaryPrefix = temporaryBase.replace(/[\\/]+$/, "") + path.sep;
  if (!temporaryRoot.startsWith(temporaryPrefix) || path.basename(temporaryRoot).length < 24) {
    throw new Error(`Refusing to remove unexpected fixture directory: ${temporaryRoot}`);
  }
  await rm(temporaryRoot, { recursive: true, force: true });
}
