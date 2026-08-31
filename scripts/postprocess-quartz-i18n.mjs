import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = process.cwd();
const manifestPath = path.join(projectRoot, "src", "generated", "published-content.json");
const FALLBACK_LINK_ORIGIN = "https://one-blog.local";

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function normalizePathname(value) {
  const pathname = value.replace(/\/+$/, "");
  return pathname || "/";
}

function localizeRelativeAttributes(html, locale, pathname) {
  const normalizedPathname = normalizePathname(pathname);
  const basePathname = normalizedPathname === `/${locale}`
    ? `${normalizedPathname}/`
    : normalizedPathname;
  const base = new URL(basePathname, FALLBACK_LINK_ORIGIN);
  return html.replace(/\b(href|src)="([^"]+)"/g, (attribute, name, value) => {
    if (
      value.startsWith("#")
      || value.startsWith("/")
      || value.startsWith("//")
      || /^[a-z][a-z\d+.-]*:/i.test(value)
    ) {
      return attribute;
    }

    const resolved = new URL(value, base);
    let localizedPath = resolved.pathname;
    if (localizedPath !== `/${locale}` && !localizedPath.startsWith(`/${locale}/`)) {
      localizedPath = `/${locale}${localizedPath}`;
    }
    localizedPath = normalizePathname(localizedPath);
    return `${name}="${localizedPath}${resolved.search}${resolved.hash}"`;
  });
}

async function walkHtmlFiles(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await walkHtmlFiles(absolutePath)));
    else if (entry.isFile() && entry.name.endsWith(".html")) files.push(absolutePath);
  }
  return files;
}

function pathnameForOutput(locale, outputRoot, htmlPath) {
  const relative = path.relative(outputRoot, htmlPath).split(path.sep).join("/");
  if (relative === "index.html") return `/${locale}`;
  if (relative.endsWith("/index.html")) return `/${locale}/${relative.slice(0, -"/index.html".length)}`;
  return `/${locale}/${relative.replace(/\.html$/, "")}`;
}

function buildAlternateMap(posts) {
  const groups = new Map();
  for (const post of posts) {
    groups.set(post.translationKey, [...(groups.get(post.translationKey) ?? []), post]);
  }
  const alternates = {};
  for (const group of groups.values()) {
    for (const post of group) {
      alternates[normalizePathname(post.quartzUrl)] = Object.fromEntries(
        group.map((candidate) => [candidate.lang, normalizePathname(candidate.quartzUrl)]),
      );
    }
  }
  return alternates;
}

function buildTranslationKeyMap(posts) {
  return Object.fromEntries(
    posts.map((post) => [normalizePathname(post.quartzUrl), post.translationKey]),
  );
}

function createClientScript(alternates, translationKeys) {
  const serialized = JSON.stringify(alternates).replace(/</g, "\\u003c");
  const serializedKeys = JSON.stringify(translationKeys).replace(/</g, "\\u003c");
  return `(() => {
  const alternates = ${serialized};
  const translationKeys = ${serializedKeys};
  const labels = { zh: "中文", en: "English" };
  const cookieName = "one-blog-lang";
  const normalize = (value) => {
    const result = decodeURI(value).replace(/\\/+$/, "");
    return result || "/";
  };
  const savePreference = (locale) => {
    if (locale !== "zh" && locale !== "en") return;
    try { localStorage.setItem(cookieName, locale); } catch {}
    document.cookie = cookieName + "=" + locale + "; Path=/; Max-Age=31536000; SameSite=Lax";
  };
  const update = () => {
    const link = document.querySelector("#one-blog-language-switcher a");
    if (!link) return;
    const pathname = normalize(window.location.pathname);
    const currentLocale = pathname.split("/").filter(Boolean)[0] === "en" ? "en" : "zh";
    const targetLocale = currentLocale === "zh" ? "en" : "zh";
    const missingKey = translationKeys[pathname];
    const fallback = missingKey
      ? "/" + targetLocale + "?translation=missing&from=" + encodeURIComponent(missingKey)
      : "/" + targetLocale;
    const target = alternates[pathname]?.[targetLocale] ?? fallback;
    link.setAttribute("href", target);
    link.setAttribute("hreflang", targetLocale === "zh" ? "zh-CN" : "en-US");
    link.setAttribute("data-one-blog-lang", targetLocale);
    link.setAttribute("data-router-ignore", "");
    link.textContent = labels[targetLocale];
  };
  const showMissingTranslationNotice = () => {
    const parameters = new URLSearchParams(window.location.search);
    if (parameters.get("translation") !== "missing") return;
    if (document.querySelector("#one-blog-translation-notice")) return;
    const locale = window.location.pathname.split("/").filter(Boolean)[0] === "en" ? "en" : "zh";
    const notice = document.createElement("aside");
    notice.id = "one-blog-translation-notice";
    notice.setAttribute("role", "status");
    notice.textContent = locale === "en"
      ? "This article is not available in English yet. You have been taken to the English home page."
      : "这篇文章暂时没有中文版，已返回中文首页。";
    document.body.prepend(notice);
  };
  document.addEventListener("click", (event) => {
    const link = event.target instanceof Element ? event.target.closest("a") : null;
    if (!link) return;
    const currentLocale = window.location.pathname.split("/").filter(Boolean)[0];
    const linkUrl = new URL(link.href, window.location.href);
    const linkLocale = linkUrl.pathname.split("/").filter(Boolean)[0];
    if (
      linkUrl.origin === window.location.origin
      && (currentLocale === "zh" || currentLocale === "en")
      && linkLocale !== "zh"
      && linkLocale !== "en"
    ) {
      linkUrl.pathname = "/" + currentLocale + (linkUrl.pathname.startsWith("/") ? linkUrl.pathname : "/" + linkUrl.pathname);
      link.href = linkUrl.pathname + linkUrl.search + linkUrl.hash;
    }
    const locale = link.getAttribute("data-one-blog-lang")
      ?? new URL(link.href, window.location.href).pathname.split("/").filter(Boolean)[0];
    savePreference(locale);
  }, true);
  document.addEventListener("nav", update);
  document.addEventListener("DOMContentLoaded", () => {
    update();
    showMissingTranslationNotice();
  }, { once: true });
  update();
  showMissingTranslationNotice();
})();
`;
}

const switcherCss = `
#one-blog-site-controls {
  position: fixed;
  top: 0.75rem;
  right: 0.75rem;
  z-index: 1000;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
#one-blog-site-controls nav { margin: 0; }
#one-blog-site-controls a {
  display: inline-flex;
  align-items: center;
  min-height: 2rem;
  padding: 0.25rem 0.75rem;
  border: 1px solid var(--lightgray);
  border-radius: 999px;
  background: color-mix(in srgb, var(--light) 90%, transparent);
  color: var(--darkgray);
  font-size: 0.9rem;
  font-weight: 600;
  text-decoration: none;
  backdrop-filter: blur(8px);
  box-shadow: 0 1px 8px rgba(0, 0, 0, 0.08);
}
#one-blog-site-controls a:hover {
  color: var(--secondary);
  border-color: var(--secondary);
}
#one-blog-translation-notice {
  position: fixed;
  top: 0.75rem;
  left: 50%;
  z-index: 999;
  max-width: min(38rem, calc(100vw - 8rem));
  margin: 0;
  padding: 0.55rem 0.9rem;
  transform: translateX(-50%);
  border: 1px solid var(--lightgray);
  border-radius: 0.5rem;
  background: color-mix(in srgb, var(--light) 94%, transparent);
  color: var(--darkgray);
  box-shadow: 0 1px 8px rgba(0, 0, 0, 0.08);
  backdrop-filter: blur(8px);
}
@media (max-width: 800px) {
  #one-blog-site-controls {
    top: auto;
    bottom: 0.75rem;
    max-width: calc(100vw - 1.5rem);
    flex-wrap: wrap;
    justify-content: flex-end;
  }
  #one-blog-translation-notice { max-width: calc(100vw - 1.5rem); }
}
`;

export async function postprocessQuartzLocale({ locale, outputRoot, siteOrigin, peerSiteUrl }) {
  if (locale !== "zh" && locale !== "en") throw new Error(`Unsupported Quartz locale: ${locale}`);
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  const posts = manifest.posts ?? [];
  const alternates = buildAlternateMap(posts);
  const translationKeys = buildTranslationKeyMap(posts);
  const postsByQuartzUrl = new Map(posts.map((post) => [normalizePathname(post.quartzUrl), post]));
  const targetLocale = locale === "zh" ? "en" : "zh";
  const targetLabel = targetLocale === "zh" ? "中文" : "English";
  const staticRoot = path.join(outputRoot, "static");
  await mkdir(staticRoot, { recursive: true });
  await writeFile(
    path.join(staticRoot, "one-blog-i18n.js"),
    createClientScript(alternates, translationKeys),
    "utf8",
  );
  await writeFile(path.join(staticRoot, "one-blog-i18n.css"), switcherCss.trimStart(), "utf8");

  for (const htmlPath of await walkHtmlFiles(outputRoot)) {
    const pathname = normalizePathname(pathnameForOutput(locale, outputRoot, htmlPath));
    const post = postsByQuartzUrl.get(pathname);
    const alternateUrls = post ? alternates[pathname] ?? {} : {};
    const missingTranslationHref = post
      ? `/${targetLocale}?translation=missing&from=${encodeURIComponent(post.translationKey)}`
      : `/${targetLocale}`;
    const targetHref = alternateUrls[targetLocale] ?? missingTranslationHref;
    const navLabel = locale === "zh" ? "切换语言" : "Switch language";
    const peerLabel = locale === "zh" ? "Refine 版" : "Refine site";
    const peerLink = peerSiteUrl
      ? `<a id="one-blog-peer-link" href="${escapeHtml(peerSiteUrl)}" target="_blank" rel="friend noopener noreferrer" data-router-ignore>${peerLabel}</a>`
      : "";
    const nav = `<div id="one-blog-site-controls">${peerLink}<nav id="one-blog-language-switcher" aria-label="${navLabel}"><a href="${escapeHtml(targetHref)}" hreflang="${targetLocale === "zh" ? "zh-CN" : "en-US"}" data-one-blog-lang="${targetLocale}" data-router-ignore>${targetLabel}</a></nav></div>`;

    const headLinks = [`<link rel="stylesheet" href="/${locale}/static/one-blog-i18n.css" data-persist="true"/>`];
    if (post && siteOrigin) {
      headLinks.push(`<link rel="canonical" href="${escapeHtml(`${siteOrigin}${pathname}`)}"/>`);
      for (const [alternateLocale, alternatePath] of Object.entries(alternateUrls)) {
        headLinks.push(`<link rel="alternate" hreflang="${alternateLocale === "zh" ? "zh-CN" : "en-US"}" href="${escapeHtml(`${siteOrigin}${alternatePath}`)}"/>`);
      }
      const defaultPath = alternateUrls.zh ?? pathname;
      headLinks.push(`<link rel="alternate" hreflang="x-default" href="${escapeHtml(`${siteOrigin}${defaultPath}`)}"/>`);
    }

    let html = await readFile(htmlPath, "utf8");
    html = html.replaceAll(FALLBACK_LINK_ORIGIN, "");
    html = localizeRelativeAttributes(html, locale, pathname);
    html = html.replace(
      /fetch\("[^"]*static\/contentIndex\.json"\)/g,
      `fetch("/${locale}/static/contentIndex.json")`,
    );
    html = html.replace("</head>", `${headLinks.join("")}</head>`);
    html = html.replace(/<body([^>]*)>/, `<body$1>${nav}`);
    html = html.replace(
      "</html>",
      `<script src="/${locale}/static/one-blog-i18n.js" type="application/javascript" data-persist="true"></script></html>`,
    );
    await writeFile(htmlPath, html, "utf8");
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const locale = process.argv[2];
  const outputRoot = path.resolve(process.argv[3] ?? path.join(projectRoot, ".quartz-output", locale));
  const siteOrigin = process.argv[4];
  const peerSiteUrl = process.argv[5];
  await postprocessQuartzLocale({ locale, outputRoot, siteOrigin, peerSiteUrl });
}
