import Link from "next/link";

import { LanguageSwitcher } from "@/components/language-switcher";
import { getDictionary, type Locale } from "@/i18n";

interface PublicHeaderProps {
  locale: Locale;
  alternateHref?: string;
}

export function PublicHeader({ locale, alternateHref }: PublicHeaderProps) {
  const dictionary = getDictionary(locale);

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/85 shadow-[0_1px_0_rgba(15,23,42,0.02)] backdrop-blur-xl">
      <div className="mx-auto flex max-w-4xl items-center justify-between px-5 py-4">
        <Link href={`/${locale}`} className="text-lg font-bold tracking-tight text-slate-950">
          {dictionary.siteName}
        </Link>
        <div className="flex items-center gap-3 sm:gap-5">
          <nav className="text-sm" aria-label={dictionary.primaryNavigation}>
            <Link href={`/${locale}/posts`} className="font-medium text-slate-600 transition hover:text-slate-950">
              {dictionary.posts}
            </Link>
          </nav>
          <LanguageSwitcher locale={locale} alternateHref={alternateHref} />
        </div>
      </div>
    </header>
  );
}
