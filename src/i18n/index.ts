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
    siteDescription: "记录软件开发、AI 工具、知识管理和做产品时遇到的问题与解法。",
    homeTitle: "工具、方法与实践",
    aboutBlog: "关于这个博客",
    recentPosts: "近期文章",
    startReading: "从这里开始",
    posts: "文章",
    allPosts: "全部文章",
    noPosts: "当前语言还没有已发布文章。",
    publishedOn: "发布于",
    backToPosts: "返回文章列表",
    primaryNavigation: "主导航",
    switchLanguage: "切换语言",
    currentLanguage: "当前语言",
    peerSite: "知识库",
    friendLinks: "友链",
    missingTranslation: "这篇文章尚未提供中文译文，已返回中文首页。",
  },
  en: {
    siteName: "One Blog",
    siteDescription: "Notes on building software, working with AI tools, organizing knowledge, and making products.",
    homeTitle: "Tools, methods, and practice",
    aboutBlog: "About this blog",
    recentPosts: "Recent posts",
    startReading: "Start reading",
    posts: "Posts",
    allPosts: "All posts",
    noPosts: "There are no published posts in this language yet.",
    publishedOn: "Published on",
    backToPosts: "Back to posts",
    primaryNavigation: "Primary navigation",
    switchLanguage: "Switch language",
    currentLanguage: "Current language",
    peerSite: "Knowledge base",
    friendLinks: "Related links",
    missingTranslation: "This article is not available in English yet. You have been returned to the English home page.",
  },
} as const;

export function getDictionary(locale: Locale) {
  return dictionaries[locale];
}
