import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { cookies, headers } from "next/headers";

import { defaultLocale, isLocale, locales } from "@/i18n";
import { getBlogFeed, rssMediaType } from "@/lib/rss";

export const metadata: Metadata = {
  alternates: { types: { [rssMediaType]: locales.map(getBlogFeed) } },
};

export default async function IndexPage() {
  const [cookieStore, requestHeaders] = await Promise.all([cookies(), headers()]);
  const savedLocale = cookieStore.get("one-blog-lang")?.value;
  const browserPrefersEnglish = requestHeaders.get("accept-language")?.toLowerCase().startsWith("en") ?? false;
  const locale = isLocale(savedLocale) ? savedLocale : browserPrefersEnglish ? "en" : defaultLocale;
  redirect(`/${locale}`);
}
