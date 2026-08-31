import { cp, lstat, readFile, readdir, realpath, rm, writeFile } from "node:fs/promises";
import path from "node:path";

const projectRoot = process.cwd();
const outputRoot = path.resolve(projectRoot, ".vercel", "output");
const configPath = path.join(outputRoot, "config.json");
const functionsRoot = path.join(outputRoot, "functions");
const middlewareFunction = path.join(
  functionsRoot,
  "src",
  "middleware.func",
);
const engine = (process.env.SITE_ENGINE ?? "next").toLowerCase();
const privateRouteSegments = [
  "blog-posts",
  "categories",
  "forgot-password",
  "login",
  "register",
];

if (!new Set(["next", "quartz"]).has(engine)) {
  throw new Error("SITE_ENGINE must be either next or quartz");
}

const relativeOutput = path.relative(projectRoot, outputRoot);
if (
  relativeOutput.startsWith("..") ||
  path.isAbsolute(relativeOutput) ||
  relativeOutput !== path.join(".vercel", "output")
) {
  throw new Error(`Refusing to modify unexpected output directory: ${outputRoot}`);
}

const config = JSON.parse(await readFile(configPath, "utf8"));
if (engine === "quartz") {
  const middlewareIndex = config.routes.findIndex(
    (route) => route.middlewarePath === "src/middleware",
  );
  const quartzRewrite = {
    src: "^/(?!quartz-render(?:/|$))(.*)$",
    dest: "/quartz-render?__path=/$1",
    override: true,
  };
  if (middlewareIndex !== -1) {
    config.routes.splice(middlewareIndex, 1, quartzRewrite);
  } else if (!config.routes.some((route) => route.dest === quartzRewrite.dest)) {
    throw new Error("Expected the Quartz middleware route in Vercel output.");
  }
}

if (engine === "next") {
  const middlewareIndex = config.routes.findIndex(
    (route) => route.middlewarePath === "src/middleware",
  );
  const localeHeaderRoute = (locale, htmlLang) => ({
    src: `^/${locale}(?:/.*)?$`,
    transforms: [
      { type: "request.headers", op: "delete", target: { key: "x-one-blog-locale" } },
      { type: "request.headers", op: "append", target: { key: "x-one-blog-locale" }, args: htmlLang },
      { type: "request.headers", op: "delete", target: { key: "x-one-blog-public" } },
      { type: "request.headers", op: "append", target: { key: "x-one-blog-public" }, args: "1" },
    ],
    continue: true,
    override: true,
  });

  if (middlewareIndex !== -1) {
    config.routes.splice(
      middlewareIndex,
      1,
      localeHeaderRoute("en", "en-US"),
      localeHeaderRoute("zh", "zh-CN"),
    );
  } else {
    const hasPreparedRoutes = ["en", "zh"].every((locale) =>
      config.routes.some((route) => route.src === `^/${locale}(?:/.*)?$`),
    );
    if (!hasPreparedRoutes) {
      throw new Error("Expected the One Blog middleware route in Vercel output.");
    }
  }

  const privateRouteMarkers = [...privateRouteSegments, "blog\\\\-posts"];
  config.routes = config.routes.filter((route) => {
    const serializedRoute = JSON.stringify(route);
    return !privateRouteMarkers.some((marker) => serializedRoute.includes(marker));
  });
  config.routes = config.routes.filter(
    (route) =>
      typeof route.dest !== "string" ||
      (!route.dest.startsWith("/posts") && !route.dest.startsWith("/posts.rsc")),
  );
  config.routes.unshift({
    src: "^/(?:blog-posts|categories|forgot-password|login|register)(?:/.*)?$",
    status: 404,
  });
  config.routes.unshift({
    src: "^/posts(?:/.*)?$",
    headers: { Location: "/zh/posts" },
    status: 308,
  });

  const privateFunctionPaths = [
    "blog-posts",
    "blog-posts.func",
    "blog-posts.rsc.func",
    "categories",
    "categories.func",
    "categories.rsc.func",
    "forgot-password.func",
    "forgot-password.rsc.func",
    "login.func",
    "login.rsc.func",
    "register.func",
    "register.rsc.func",
    "posts.func",
    "posts.rsc.func",
    "posts",
  ];
  for (const relativeFunctionPath of privateFunctionPaths) {
    await rm(path.join(functionsRoot, relativeFunctionPath), { recursive: true, force: true });
  }

  await rm(middlewareFunction, { recursive: true, force: true });
  const middlewareParent = path.dirname(middlewareFunction);
  try {
    if ((await readdir(middlewareParent)).length === 0) {
      await rm(middlewareParent, { recursive: true });
    }
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
}

async function findSymbolicLinks(directory) {
  const links = [];

  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const entryPath = path.join(directory, entry.name);
    const entryStats = await lstat(entryPath);

    if (entryStats.isSymbolicLink()) {
      links.push(entryPath);
    } else if (entryStats.isDirectory()) {
      links.push(...(await findSymbolicLinks(entryPath)));
    }
  }

  return links;
}

async function findFiles(directory, predicate) {
  const files = [];

  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const entryPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await findFiles(entryPath, predicate)));
    } else if (entry.isFile() && predicate(entryPath)) {
      files.push(entryPath);
    }
  }

  return files;
}

const symbolicLinks = await findSymbolicLinks(outputRoot);
for (const linkPath of symbolicLinks) {
  const targetPath = await realpath(linkPath);
  const relativeTarget = path.relative(outputRoot, targetPath);

  if (relativeTarget.startsWith("..") || path.isAbsolute(relativeTarget)) {
    throw new Error(`Refusing to copy external symlink target: ${targetPath}`);
  }

  await rm(linkPath, { recursive: true, force: true });
  await cp(targetPath, linkPath, { recursive: true, dereference: true });
}

if (engine === "quartz") {
  const keepRootEntries = new Set(["quartz-render.func"]);
  const functionsPrefix = functionsRoot.replace(/[\\/]+$/, "") + path.sep;
  for (const entry of await readdir(functionsRoot, { withFileTypes: true })) {
    if (keepRootEntries.has(entry.name)) continue;
    const target = path.resolve(functionsRoot, entry.name);
    if (!target.startsWith(functionsPrefix)) {
      throw new Error(`Refusing to remove unexpected Vercel function path: ${target}`);
    }
    await rm(target, { recursive: true, force: true });
  }

  const quartzFunctionRoot = path.join(functionsRoot, "quartz-render.func");
  const bundledQuartzOutput = path.join(quartzFunctionRoot, ".quartz-output");
  await rm(bundledQuartzOutput, { recursive: true, force: true });
  await cp(path.join(projectRoot, ".quartz-output"), bundledQuartzOutput, {
    recursive: true,
    dereference: true,
  });
}

if (engine === "next") {
  const publicRscAliases = [
    {
      source: path.join(functionsRoot, "[locale]", "posts.func"),
      destination: path.join(functionsRoot, "[locale]", "posts.rsc.func"),
    },
    {
      source: path.join(functionsRoot, "[locale]", "posts", "[slug].func"),
      destination: path.join(functionsRoot, "[locale]", "posts", "[slug].rsc.func"),
    },
  ];
  for (const { source, destination } of publicRscAliases) {
    await rm(destination, { recursive: true, force: true });
    await cp(source, destination, { recursive: true, dereference: true });
  }
}

const clientManifestRoot = path.join(projectRoot, ".next", "server", "app");
const clientManifests = engine === "quartz"
  ? []
  : (
      await findFiles(
        clientManifestRoot,
        (filePath) => path.basename(filePath) === "page_client-reference-manifest.js",
      )
    ).filter((filePath) => {
      const relativePath = path.relative(clientManifestRoot, filePath);
      return !relativePath
        .split(path.sep)
        .some((segment) => privateRouteSegments.includes(segment));
    });

const functionConfigs = (
  await findFiles(
    functionsRoot,
    (filePath) => path.basename(filePath) === ".vc-config.json",
  )
).filter((filePath) => !filePath.includes(`${path.sep}middleware.func${path.sep}`));
const completeAppPathsManifest = JSON.parse(
  await readFile(path.join(projectRoot, ".next", "server", "app-paths-manifest.json"), "utf8"),
);
const publicAppPathsManifest = engine === "quartz"
  ? completeAppPathsManifest
  : Object.fromEntries(
      Object.entries(completeAppPathsManifest).filter(([routePath]) =>
        !routePath
          .split("/")
          .some((segment) => privateRouteSegments.includes(segment)),
      ),
    );

for (const functionConfigPath of functionConfigs) {
  const functionConfig = JSON.parse(await readFile(functionConfigPath, "utf8"));
  functionConfig.filePathMap ??= {};

  if (engine === "quartz" && functionConfigPath.includes(`${path.sep}quartz-render.func${path.sep}`)) {
    for (const logicalPath of Object.keys(functionConfig.filePathMap)) {
      if (!logicalPath.startsWith(".quartz-output/")) continue;
      const bundledPath = path.join(
        functionsRoot,
        "quartz-render.func",
        ...logicalPath.split("/"),
      );
      functionConfig.filePathMap[logicalPath] = path
        .relative(projectRoot, bundledPath)
        .split(path.sep)
        .join("/");
    }
  }

  for (const manifestPath of clientManifests) {
    const relativeManifestPath = path
      .relative(projectRoot, manifestPath)
      .split(path.sep)
      .join("/");
    functionConfig.filePathMap[relativeManifestPath] = relativeManifestPath;
  }

  await writeFile(
    functionConfigPath,
    `${JSON.stringify(functionConfig, null, 2)}\n`,
  );
  await writeFile(
    path.join(
      path.dirname(functionConfigPath),
      ".next",
      "server",
      "app-paths-manifest.json",
    ),
    `${JSON.stringify(publicAppPathsManifest)}\n`,
  );
}

await writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`);

console.log(
  `Prepared ${engine} anonymous Vercel output: materialized ${symbolicLinks.length} Windows symlink(s) and added ${clientManifests.length} client manifest(s).`,
);
