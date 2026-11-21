import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PostList } from "@/components/post-list";
import { PublicHeader } from "@/components/public-header";
import { getDictionary, isLocale } from "@/i18n";
import { getPublishedPosts } from "@/lib/content";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const dictionary = getDictionary(locale);
  return {
    title: dictionary.allPosts,
    description: dictionary.siteDescription,
    alternates: {
      canonical: `/${locale}/posts`,
      languages: { "zh-CN": "/zh/posts", "en-US": "/en/posts", "x-default": "/zh/posts" },
    },
  };
}

export default async function PostsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dictionary = getDictionary(locale);
  const targetLocale = locale === "zh" ? "en" : "zh";
  const posts = getPublishedPosts(locale);

  return (
    <>
      <PublicHeader locale={locale} alternateHref={`/${targetLocale}/posts`} />
      <main className="mx-auto w-full max-w-4xl flex-1 px-5 py-14">
        <h1 className="mb-8 text-4xl font-black tracking-tight text-slate-950">{dictionary.allPosts}</h1>
        <PostList posts={posts} locale={locale} />
      </main>
    </>
  );
}
