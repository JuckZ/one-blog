import Link from "next/link";

import { LanguageLink } from "@/components/language-link";
import { getDictionary, localeConfig, type Locale } from "@/i18n";

interface PublicHeaderProps {
  locale: Locale;
  alternateHref?: string;
}

export function PublicHeader({ locale, alternateHref }: PublicHeaderProps) {
  const dictionary = getDictionary(locale);
  const targetLocale: Locale = locale === "zh" ? "en" : "zh";
  const peerSiteUrl = process.env.NEXT_PUBLIC_PEER_SITE_URL;

  return (
    <header className="border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-4xl items-center justify-between px-5 py-4">
        <Link href={`/${locale}`} className="text-lg font-bold tracking-tight text-slate-950">
          {dictionary.siteName}
        </Link>
        <nav className="flex items-center gap-5 text-sm" aria-label={dictionary.siteName}>
          <Link href={`/${locale}/posts`} className="text-slate-700 hover:text-slate-950">
            {dictionary.posts}
          </Link>
          {peerSiteUrl ? (
            <a
              href={peerSiteUrl}
              target="_blank"
              rel="friend noopener noreferrer"
              className="text-slate-700 hover:text-slate-950"
            >
              {dictionary.peerSite}
            </a>
          ) : null}
          <LanguageLink
            href={alternateHref ?? `/${targetLocale}`}
            hrefLang={localeConfig[targetLocale].htmlLang}
            locale={targetLocale}
            ariaLabel={dictionary.switchLanguage}
            className="rounded-full border border-slate-300 px-3 py-1.5 font-medium text-slate-700 hover:border-slate-500 hover:text-slate-950"
          >
            {localeConfig[targetLocale].label}
          </LanguageLink>
        </nav>
      </div>
    </header>
  );
}
