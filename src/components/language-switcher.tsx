import { LanguageLink } from "@/components/language-link";
import { getDictionary, localeConfig, type Locale } from "@/i18n";

interface LanguageSwitcherProps {
  locale: Locale;
  alternateHref?: string;
}

const shortLabels: Record<Locale, string> = {
  zh: "中",
  en: "EN",
};

function GlobeIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-4 w-4 shrink-0"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M3.6 9h16.8M3.6 15h16.8M12 3c2.2 2.45 3.3 5.45 3.3 9S14.2 18.55 12 21c-2.2-2.45-3.3-5.45-3.3-9S9.8 5.45 12 3Z" />
    </svg>
  );
}

export function LanguageSwitcher({ locale, alternateHref }: LanguageSwitcherProps) {
  const dictionary = getDictionary(locale);
  const targetLocale: Locale = locale === "zh" ? "en" : "zh";

  return (
    <nav aria-label={dictionary.switchLanguage}>
      <div className="inline-flex h-10 items-center gap-0.5 rounded-full border border-slate-200 bg-slate-100/90 p-1 text-sm shadow-sm">
        <span className="ml-1.5 mr-0.5 text-slate-500">
          <GlobeIcon />
        </span>
        {(["zh", "en"] as const).map((candidate) => {
          const label = localeConfig[candidate].label;
          if (candidate === locale) {
            return (
              <span
                key={candidate}
                aria-current="page"
                aria-label={`${dictionary.currentLanguage}: ${label}`}
                title={label}
                className="inline-flex h-8 min-w-9 items-center justify-center rounded-full bg-slate-950 px-2 font-semibold text-white shadow-sm"
              >
                {shortLabels[candidate]}
              </span>
            );
          }

          return (
            <LanguageLink
              key={candidate}
              href={alternateHref ?? `/${targetLocale}`}
              hrefLang={localeConfig[targetLocale].htmlLang}
              locale={targetLocale}
              ariaLabel={label}
              title={label}
              className="inline-flex h-8 min-w-9 items-center justify-center rounded-full px-2 font-semibold text-slate-600 transition hover:bg-white hover:text-slate-950 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-1"
            >
              {shortLabels[candidate]}
            </LanguageLink>
          );
        })}
      </div>
    </nav>
  );
}
