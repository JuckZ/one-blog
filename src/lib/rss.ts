import { getDictionary, localeConfig, type Locale } from "@/i18n";

export const rssMediaType = "application/rss+xml";

export const rssHeaders = {
  "Content-Type": `${rssMediaType}; charset=utf-8`,
  "Cache-Control": "public, max-age=300, must-revalidate",
};

export function getBlogFeed(locale: Locale) {
  return {
    title: `${getDictionary(locale).siteName} (${localeConfig[locale].label})`,
    url: `/${locale}/rss.xml`,
  };
}
