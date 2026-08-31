export const locales = ["zh", "en"] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "zh";

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && locales.includes(value as Locale);
}

export const localeConfig = {
  zh: { htmlLang: "zh-CN", label: "中文", dateLocale: "zh-CN" },
  en: { htmlLang: "en-US", label: "English", dateLocale: "en-US" },
} as const satisfies Record<Locale, { htmlLang: string; label: string; dateLocale: string }>;

export const dictionaries = {
  zh: {
    siteName: "One Blog",
    siteDescription: "一个默认使用中文、同时支持英文内容的个人知识博客。",
    homeTitle: "用两种语言，记录同一个世界",
    homeDescription: "这里收录了知识库中明确选择公开的文章。",
    browsePosts: "浏览文章",
    posts: "文章",
    allPosts: "全部文章",
    noPosts: "当前语言还没有已发布文章。",
    publishedOn: "发布于",
    backToPosts: "返回文章列表",
    switchLanguage: "切换语言",
    peerSite: "Quartz 版",
    publicationNote: "只有 frontmatter 中严格设置 publish: true 的笔记才会公开。",
  },
  en: {
    siteName: "One Blog",
    siteDescription: "A personal knowledge blog with Chinese as the default and English support.",
    homeTitle: "One world, written in two languages",
    homeDescription: "This site contains notes explicitly selected for public release.",
    browsePosts: "Browse posts",
    posts: "Posts",
    allPosts: "All posts",
    noPosts: "There are no published posts in this language yet.",
    publishedOn: "Published on",
    backToPosts: "Back to posts",
    switchLanguage: "Switch language",
    peerSite: "Quartz site",
    publicationNote: "Only notes with a strict publish: true frontmatter value are public.",
  },
} as const;

export function getDictionary(locale: Locale) {
  return dictionaries[locale];
}
