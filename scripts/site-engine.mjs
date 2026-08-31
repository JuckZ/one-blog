import { existsSync } from "node:fs";
import { readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";

import { postprocessQuartzLocale } from "./postprocess-quartz-i18n.mjs";

const projectRoot = process.cwd();
const action = process.argv[2] ?? "build";
const engine = (process.env.SITE_ENGINE ?? "next").toLowerCase();

if (!new Set(["next", "quartz"]).has(engine)) {
  throw new Error("SITE_ENGINE must be either next or quartz");
}
if (!new Set(["build", "dev"]).has(action)) {
  throw new Error("site-engine supports only build and dev actions");
}

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: projectRoot,
      env: process.env,
      stdio: "inherit",
      shell: false,
      ...options,
    });
    child.once("error", reject);
    child.once("exit", (code, signal) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} exited with ${code ?? signal}`));
    });
  });
}

async function prepareContent() {
  await run(process.execPath, [path.join(projectRoot, "scripts", "prepare-published-content.mjs")]);
}

async function ensureQuartzDependencies() {
  const quartzNodeModules = path.join(projectRoot, "quartz-engine", "node_modules");
  if (existsSync(quartzNodeModules)) return;
  const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
  // Vercel installs with NODE_ENV=production, but Quartz keeps its build-time
  // compiler (esbuild) in devDependencies. Explicitly include those packages.
  await run(npmCommand, ["ci", "--include=dev", "--prefix", "quartz-engine"]);
}

async function buildQuartz() {
  await ensureQuartzDependencies();
  const quartzRoot = path.join(projectRoot, "quartz-engine");
  const runtimeConfigPath = path.join(quartzRoot, "quartz.config.yaml");
  if (existsSync(runtimeConfigPath)) {
    throw new Error(`Refusing to overwrite Quartz runtime config: ${runtimeConfigPath}`);
  }

  const localeDefinitions = {
    "zh-CN": { locale: "zh", htmlLocale: "zh-CN" },
    "en-US": { locale: "en", htmlLocale: "en-US" },
  };
  const requestedLocales = (process.env.QUARTZ_LOCALES ?? "zh-CN,en-US")
    .split(",")
    .map((locale) => locale.trim())
    .filter(Boolean);
  if (requestedLocales.length === 0 || requestedLocales.some((locale) => !localeDefinitions[locale])) {
    throw new Error("QUARTZ_LOCALES must contain zh-CN, en-US, or both");
  }
  if (process.env.QUARTZ_LOCALE && !process.env.QUARTZ_LOCALES) {
    console.warn("QUARTZ_LOCALE is deprecated; both locales are built by default. Use QUARTZ_LOCALES to override.");
  }
  const configuredBaseUrl = process.env.QUARTZ_BASE_URL;
  const explicitBaseUrl = configuredBaseUrl?.toLowerCase() === "auto"
    ? undefined
    : configuredBaseUrl ?? process.env.NEXT_PUBLIC_SITE_URL;
  const vercelHost = configuredBaseUrl?.toLowerCase() === "auto"
    ? process.env.VERCEL_URL ?? process.env.VERCEL_PROJECT_PRODUCTION_URL
    : process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL;
  const rawBaseUrl = explicitBaseUrl ?? vercelHost;
  let baseUrlRoot = "one-blog.vercel.app";
  let siteOrigin = "https://one-blog.vercel.app";
  if (rawBaseUrl) {
    const parsed = new URL(rawBaseUrl.includes("://") ? rawBaseUrl : `https://${rawBaseUrl}`);
    baseUrlRoot = `${parsed.host}${parsed.pathname}`.replace(/\/$/, "");
    siteOrigin = parsed.origin;
  }

  const outputRoot = path.join(projectRoot, ".quartz-output");
  await rm(outputRoot, { recursive: true, force: true });

  for (const requestedLocale of [...new Set(requestedLocales)]) {
    const { locale } = localeDefinitions[requestedLocale];
    const localeContentRoot = path.join(projectRoot, ".quartz-content", locale);
    if (!existsSync(localeContentRoot)) {
      throw new Error(`Quartz content projection is missing: ${localeContentRoot}`);
    }
    const localeOutputRoot = path.join(outputRoot, locale);
    const localeBaseUrl = `${baseUrlRoot}/${locale}`;

    let runtimeConfig = await readFile(path.join(projectRoot, "quartz.config.yaml"), "utf8");
    runtimeConfig = runtimeConfig
      .replace(
        "# yaml-language-server: $schema=./quartz-engine/quartz/plugins/quartz-plugins.schema.json",
        "# yaml-language-server: $schema=./quartz/plugins/quartz-plugins.schema.json",
      )
      .replace(/^  locale: .*$/m, `  locale: ${requestedLocale}`)
      .replace(/^  baseUrl: .*$/m, `  baseUrl: ${localeBaseUrl}`);

    await writeFile(runtimeConfigPath, runtimeConfig, "utf8");
    try {
      await run(
        process.execPath,
        [
          path.join(quartzRoot, "quartz", "bootstrap-cli.mjs"),
          "build",
          "--directory",
          `../.quartz-content/${locale}`,
          "--output",
          `../.quartz-output/${locale}`,
        ],
        { cwd: quartzRoot },
      );
      await postprocessQuartzLocale({ locale, outputRoot: localeOutputRoot, siteOrigin });
    } finally {
      await rm(runtimeConfigPath, { force: true });
    }
  }
}

async function runNext(nextAction) {
  await run(process.execPath, [
    path.join(projectRoot, "node_modules", "next", "dist", "bin", "next"),
    nextAction,
    ...(nextAction === "dev" ? ["-p", "3001"] : []),
  ]);
}

console.log(`Using site engine: ${engine}`);
await prepareContent();

if (engine === "quartz") await buildQuartz();
await runNext(action);
