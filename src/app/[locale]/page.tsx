import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PostList } from "@/components/post-list";
import { PublicHeader } from "@/components/public-header";
import { getDictionary, isLocale, localeConfig } from "@/i18n";
import { getPublishedPosts } from "@/lib/content";
import { getBlogFeed, rssMediaType } from "@/lib/rss";

export function generateMetadata({ params }: { params: { locale: string } }): Metadata {
  if (!isLocale(params.locale)) return {};
  const dictionary = getDictionary(params.locale);
  return {
    title: dictionary.siteName,
    description: dictionary.siteDescription,
    alternates: {
      canonical: `/${params.locale}`,
      languages: { "zh-CN": "/zh", "en-US": "/en", "x-default": "/zh" },
      types: { [rssMediaType]: [getBlogFeed(params.locale)] },
    },
    openGraph: { locale: localeConfig[params.locale].htmlLang.replace("-", "_") },
  };
}

export default function LocaleHome({
  params,
  searchParams,
}: {
  params: { locale: string };
  searchParams?: { translation?: string | string[]; from?: string | string[] };
}) {
  if (!isLocale(params.locale)) notFound();
  const dictionary = getDictionary(params.locale);
  const targetLocale = params.locale === "zh" ? "en" : "zh";
  const missingTranslation = searchParams?.translation === "missing";
  const posts = getPublishedPosts(params.locale);
  const introduction = posts.find((post) => post.translationKey === "home");
  const recentPosts = posts
    .filter((post) => post !== introduction && post.translationKey !== "quartz-i18n-example")
    .slice(0, 3);
  const hasRecentPosts = recentPosts.length > 0;
  const readingList = hasRecentPosts ? recentPosts : posts.filter((post) => post === introduction);

  return (
    <>
      <PublicHeader locale={params.locale} alternateHref={`/${targetLocale}`} />
      <main className="mx-auto w-full max-w-4xl flex-1 px-5 pb-16 pt-8 sm:pt-12">
        {missingTranslation ? (
          <p role="status" className="mb-6 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
            {dictionary.missingTranslation}
          </p>
        ) : null}
        <section
          aria-labelledby="home-heading"
          className="rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-teal-950 px-6 py-8 sm:px-10 sm:py-10"
        >
          <h1 id="home-heading" className="text-balance text-3xl font-bold tracking-tight text-white sm:text-5xl">
            {dictionary.homeTitle}
          </h1>
          <p className="mb-0 mt-4 max-w-xl text-pretty leading-7 text-slate-200 sm:text-lg">
            {dictionary.siteDescription}
          </p>
          {introduction && hasRecentPosts && (
            <Link
              href={introduction.url}
              className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-md text-sm font-semibold text-teal-200 underline underline-offset-4 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-teal-200"
            >
              {dictionary.aboutBlog}
              <span aria-hidden="true">→</span>
            </Link>
          )}
        </section>

        <section aria-labelledby="recent-posts" className="mt-9 sm:mt-11">
          <div className="mb-4 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <h2 id="recent-posts" className="mb-0 text-2xl font-bold tracking-tight text-slate-950">
              {hasRecentPosts ? dictionary.recentPosts : dictionary.startReading}
            </h2>
            <Link
              href={`/${params.locale}/posts`}
              className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-teal-800 underline-offset-4 hover:underline"
            >
              {dictionary.allPosts}
              <span aria-hidden="true">→</span>
            </Link>
          </div>
          <PostList posts={readingList} locale={params.locale} headingLevel="h3" />
        </section>
      </main>
    </>
  );
}
