import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PublicHeader } from "@/components/public-header";
import { getDictionary, isLocale, localeConfig } from "@/i18n";

export function generateMetadata({ params }: { params: { locale: string } }): Metadata {
  if (!isLocale(params.locale)) return {};
  const dictionary = getDictionary(params.locale);
  return {
    title: dictionary.siteName,
    description: dictionary.siteDescription,
    alternates: {
      canonical: `/${params.locale}`,
      languages: { "zh-CN": "/zh", "en-US": "/en", "x-default": "/zh" },
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

  return (
    <>
      <PublicHeader locale={params.locale} alternateHref={`/${targetLocale}`} />
      <main className="mx-auto w-full max-w-4xl flex-1 px-5 py-20">
        {missingTranslation ? (
          <p role="status" className="mb-8 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
            {dictionary.missingTranslation}
          </p>
        ) : null}
        <div className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-700">One Blog</p>
          <h1 className="mt-5 text-4xl font-black tracking-tight text-slate-950 sm:text-6xl">{dictionary.homeTitle}</h1>
          <p className="mt-6 text-lg leading-8 text-slate-600">{dictionary.homeDescription}</p>
          <Link href={`/${params.locale}/posts`} className="mt-8 inline-flex rounded-full bg-slate-950 px-5 py-3 font-semibold text-white hover:bg-blue-700">
            {dictionary.browsePosts}
          </Link>
        </div>
        <p className="mt-16 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">{dictionary.publicationNote}</p>
      </main>
    </>
  );
}
