import { notFound } from "next/navigation";

import { PublicFooter } from "@/components/public-footer";
import { isLocale, localeConfig, locales } from "@/i18n";

export const dynamicParams = false;

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: Readonly<{ children: React.ReactNode; params: Promise<{ locale: string }> }>) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return (
    <div className="flex min-h-screen flex-col bg-slate-50" lang={localeConfig[locale].htmlLang}>
      {children}
      <PublicFooter locale={locale} />
    </div>
  );
}
