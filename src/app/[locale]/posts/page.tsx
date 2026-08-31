import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PostList } from "@/components/post-list";
import { PublicHeader } from "@/components/public-header";
import { getDictionary, isLocale, localeConfig } from "@/i18n";
import { getPublishedPosts } from "@/lib/content";

export function generateMetadata({ params }: { params: { locale: string } }): Metadata {
  if (!isLocale(params.locale)) return {};
  const dictionary = getDictionary(params.locale);
  return {
    title: dictionary.allPosts,
    description: dictionary.siteDescription,
    alternates: {
      canonical: `/${params.locale}/posts`,
      languages: { "zh-CN": "/zh/posts", "en-US": "/en/posts", "x-default": "/zh/posts" },
    },
  };
}

export default function PostsPage({ params }: { params: { locale: string } }) {
  if (!isLocale(params.locale)) notFound();
  const dictionary = getDictionary(params.locale);
  const targetLocale = params.locale === "zh" ? "en" : "zh";
  const posts = getPublishedPosts(params.locale);

  return (
    <div className="min-h-screen bg-slate-50" lang={localeConfig[params.locale].htmlLang}>
      <PublicHeader locale={params.locale} alternateHref={`/${targetLocale}/posts`} />
      <main className="mx-auto max-w-4xl px-5 py-14">
        <h1 className="mb-8 text-4xl font-black tracking-tight text-slate-950">{dictionary.allPosts}</h1>
        <PostList posts={posts} locale={params.locale} />
      </main>
    </div>
  );
}
