import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { MarkdownContent } from "@/components/markdown-content";
import { PublicHeader } from "@/components/public-header";
import { getDictionary, isLocale, localeConfig, type Locale } from "@/i18n";
import { getAllPublishedPosts, getPost, getTranslation } from "@/lib/content";

export const dynamicParams = false;

export function generateStaticParams() {
  return getAllPublishedPosts().map((post) => ({ locale: post.lang, slug: post.slug }));
}

function resolvePost(params: { locale: string; slug: string }) {
  if (!isLocale(params.locale)) return undefined;
  return getPost(params.locale, decodeURI(params.slug));
}

export function generateMetadata({ params }: { params: { locale: string; slug: string } }): Metadata {
  const post = resolvePost(params);
  if (!post) return {};
  const targetLocale: Locale = post.lang === "zh" ? "en" : "zh";
  const translation = getTranslation(post, targetLocale);
  const languages: Record<string, string> = { [post.htmlLang]: post.url };
  if (translation) languages[translation.htmlLang] = translation.url;

  return {
    title: post.title,
    description: post.summary,
    alternates: { canonical: post.url, languages },
    openGraph: {
      title: post.title,
      description: post.summary,
      type: "article",
      locale: post.htmlLang.replace("-", "_"),
      publishedTime: post.date,
    },
  };
}

export default function PostPage({ params }: { params: { locale: string; slug: string } }) {
  const post = resolvePost(params);
  if (!post) notFound();
  const dictionary = getDictionary(post.lang);
  const targetLocale: Locale = post.lang === "zh" ? "en" : "zh";
  const translation = getTranslation(post, targetLocale);
  const date = new Intl.DateTimeFormat(localeConfig[post.lang].dateLocale, { dateStyle: "long" }).format(new Date(post.date));
  const alternateHref = translation?.url
    ?? `/${targetLocale}?translation=missing&from=${encodeURIComponent(post.translationKey ?? post.slug)}`;

  return (
    <div className="min-h-screen bg-slate-50" lang={post.htmlLang}>
      <PublicHeader locale={post.lang} alternateHref={alternateHref} />
      <main className="mx-auto max-w-3xl px-5 py-14">
        <Link href={`/${post.lang}/posts`} className="text-sm font-semibold text-blue-700 hover:text-blue-900">← {dictionary.backToPosts}</Link>
        <article className="mt-8 rounded-3xl border border-slate-200 bg-white p-7 shadow-sm sm:p-12">
          <header className="mb-10 border-b border-slate-200 pb-8">
            <p className="text-sm text-slate-500">{dictionary.publishedOn} {date}</p>
            <h1 className="mt-3 text-4xl font-black tracking-tight text-slate-950">{post.title}</h1>
            <p className="mt-4 text-lg text-slate-600">{post.summary}</p>
          </header>
          <MarkdownContent content={post.content} />
        </article>
      </main>
    </div>
  );
}
