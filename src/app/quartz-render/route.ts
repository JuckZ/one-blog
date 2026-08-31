import { readFile, stat } from "node:fs/promises";
import path from "node:path";

import publishedContent from "@/generated/published-content.json";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const quartzOutputRoot = path.resolve(process.cwd(), ".quartz-output");
const contentTypes: Record<string, string> = {
  ".avif": "image/avif",
  ".css": "text/css; charset=utf-8",
  ".gif": "image/gif",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".m4a": "audio/mp4",
  ".map": "application/json; charset=utf-8",
  ".mp3": "audio/mpeg",
  ".mp4": "video/mp4",
  ".ogg": "audio/ogg",
  ".pdf": "application/pdf",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
  ".wav": "audio/wav",
  ".webm": "video/webm",
  ".webp": "image/webp",
  ".xml": "application/xml; charset=utf-8",
};

function safeOutputPath(relativePath: string): string | undefined {
  const normalized = relativePath.replace(/\\/g, "/").replace(/^\/+/, "");
  if (normalized.includes("\0") || normalized.split("/").includes("..")) return undefined;
  const resolved = path.resolve(quartzOutputRoot, normalized);
  const prefix = quartzOutputRoot.replace(/[\\/]+$/, "") + path.sep;
  return resolved.startsWith(prefix) ? resolved : undefined;
}

async function findOutput(pathname: string): Promise<string | undefined> {
  const cleanPath = pathname.replace(/^\/+|\/+$/g, "");
  const hasExtension = path.extname(cleanPath) !== "";
  const candidates = cleanPath === ""
    ? ["index.html"]
    : hasExtension
      ? [cleanPath]
      : [`${cleanPath}.html`, `${cleanPath}/index.html`];

  for (const candidate of candidates) {
    const outputPath = safeOutputPath(candidate);
    if (!outputPath) continue;
    try {
      if ((await stat(outputPath)).isFile()) return outputPath;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
  }
  return undefined;
}

function localeFromPathname(pathname: string): "zh" | "en" {
  return pathname.split("/").filter(Boolean)[0] === "en" ? "en" : "zh";
}

function preferredLocale(request: Request): "zh" | "en" {
  const savedLocale = request.headers
    .get("cookie")
    ?.split(";")
    .map((cookie) => cookie.trim().split("="))
    .find(([name]) => name === "one-blog-lang")?.[1];
  if (savedLocale === "zh" || savedLocale === "en") return savedLocale;

  const acceptedLanguages = request.headers.get("accept-language")?.toLowerCase() ?? "";
  return acceptedLanguages.startsWith("en") ? "en" : "zh";
}

function redirectToLocalizedPath(request: Request, pathname: string): Response {
  const locale = preferredLocale(request);
  const destination = new URL(`/${locale}${pathname === "/" ? "" : pathname}`, request.url);
  destination.search = "";
  return Response.redirect(destination, 307);
}

function robotsResponse(request: Request, headOnly: boolean): Response {
  const sitemapUrl = new URL("/sitemap.xml", request.url).toString();
  const body = `User-Agent: *\nAllow: /\nSitemap: ${sitemapUrl}\n`;
  return new Response(headOnly ? null : body, {
    headers: {
      "Cache-Control": "public, max-age=0, must-revalidate",
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
}

function sitemapResponse(request: Request, headOnly: boolean): Response {
  const paths = new Set<string>(["/zh", "/en"]);
  for (const post of publishedContent.posts) paths.add(post.quartzUrl);
  const urls = [...paths]
    .sort()
    .map((pathname) => `  <url><loc>${new URL(pathname, request.url).toString()}</loc></url>`)
    .join("\n");
  const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
  return new Response(headOnly ? null : body, {
    headers: {
      "Cache-Control": "public, max-age=0, must-revalidate",
      "Content-Type": "application/xml; charset=utf-8",
    },
  });
}

async function serve(request: Request, headOnly = false): Promise<Response> {
  if (process.env.SITE_ENGINE !== "quartz") return new Response("Not Found", { status: 404 });
  const requestUrl = new URL(request.url);
  const pathname = request.headers.get("x-one-blog-quartz-path") ?? requestUrl.searchParams.get("__path");
  if (pathname === null) return new Response("Not Found", { status: 404 });

  if (pathname === "/robots.txt") return robotsResponse(request, headOnly);
  if (pathname === "/sitemap.xml") return sitemapResponse(request, headOnly);

  const firstSegment = pathname.split("/").filter(Boolean)[0];
  if (firstSegment !== "zh" && firstSegment !== "en") {
    return redirectToLocalizedPath(request, pathname);
  }

  const outputPath = await findOutput(pathname);
  const selectedPath = outputPath ?? safeOutputPath(`${localeFromPathname(pathname)}/404.html`);
  if (!selectedPath) return new Response("Not Found", { status: 404 });

  let body: Buffer;
  try {
    body = await readFile(selectedPath);
  } catch {
    return new Response("Not Found", { status: 404 });
  }

  const extension = path.extname(selectedPath).toLowerCase();
  const isHtml = extension === ".html";
  const headers = new Headers({
    "Content-Type": contentTypes[extension] ?? "application/octet-stream",
    "Cache-Control": isHtml
      ? "public, max-age=0, must-revalidate"
      : "public, max-age=31536000, immutable",
  });
  const responseBody = headOnly ? null : new Uint8Array(body);
  return new Response(responseBody, { status: outputPath ? 200 : 404, headers });
}

export function GET(request: Request) {
  return serve(request);
}

export function HEAD(request: Request) {
  return serve(request, true);
}
