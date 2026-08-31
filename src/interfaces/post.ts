import type { Locale } from "@/i18n";

export interface Post {
  title: string;
  summary: string;
  date: string;
  lang: Locale;
  htmlLang: "zh-CN" | "en-US";
  translationKey: string | null;
  publish: true;
  tags: string[];
  slug: string;
  path: string;
  url: string;
  quartzSlug: string;
  quartzUrl: string;
  content: string;
}
