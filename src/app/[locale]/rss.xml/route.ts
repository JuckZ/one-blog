import { getDictionary, isLocale, localeConfig } from "@/i18n";
import { getPublishedPosts } from "@/lib/content";
import { getBlogFeed, rssHeaders, rssMediaType } from "@/lib/rss";
import { getSiteUrl } from "@/lib/site";

function escapeXml(value: string): string {
  return value
    .replace(/[^\t\n\r\u0020-\uD7FF\uE000-\uFFFD\u{10000}-\u{10FFFF}]/gu, "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

export function GET(_request: Request, { params }: { params: { locale: string } }) {
  const { locale } = params;
  if (!isLocale(locale)) return new Response("Not Found", { status: 404 });

  const siteUrl = getSiteUrl();
  const feed = getBlogFeed(locale);
  const homeUrl = new URL(`/${locale}`, siteUrl).href;
  const feedUrl = new URL(feed.url, siteUrl).href;
  const items = getPublishedPosts(locale).map((post) => {
    const postUrl = escapeXml(new URL(post.url, siteUrl).href);
    return `    <item>
      <title>${escapeXml(post.title)}</title>
      <link>${postUrl}</link>
      <guid>${postUrl}</guid>
      <description>${escapeXml(post.summary)}</description>
      <pubDate>${new Date(post.date).toUTCString()}</pubDate>
    </item>`;
  }).join("\n");

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(feed.title)}</title>
    <link>${escapeXml(homeUrl)}</link>
    <description>${escapeXml(getDictionary(locale).siteDescription)}</description>
    <language>${localeConfig[locale].htmlLang}</language>
    <atom:link href="${escapeXml(feedUrl)}" rel="self" type="${rssMediaType}"/>
${items}
  </channel>
</rss>
`;
  return new Response(body, { headers: rssHeaders });
}
