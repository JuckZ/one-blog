"use client";

import type { Locale } from "@/i18n";

interface LanguageLinkProps {
  href: string;
  hrefLang: string;
  locale: Locale;
  ariaLabel: string;
  title?: string;
  className?: string;
  children: React.ReactNode;
}

export function LanguageLink({
  href,
  hrefLang,
  locale,
  ariaLabel,
  title,
  className,
  children,
}: LanguageLinkProps) {
  function rememberLanguage() {
    try {
      localStorage.setItem("one-blog-lang", locale);
    } catch {
      // Cookie remains the cross-engine source of truth when storage is unavailable.
    }
    document.cookie = `one-blog-lang=${locale}; Path=/; Max-Age=31536000; SameSite=Lax`;
  }

  return (
    <a
      href={href}
      hrefLang={hrefLang}
      aria-label={ariaLabel}
      title={title}
      className={className}
      onClick={rememberLanguage}
    >
      {children}
    </a>
  );
}
