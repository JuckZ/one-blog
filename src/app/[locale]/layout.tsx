import { notFound } from "next/navigation";

import { PublicFooter } from "@/components/public-footer";
import { isLocale, localeConfig, locales } from "@/i18n";

export const dynamicParams = false;

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default function LocaleLayout({
  children,
  params,
}: Readonly<{ children: React.ReactNode; params: { locale: string } }>) {
  if (!isLocale(params.locale)) notFound();
  return (
    <div className="flex min-h-screen flex-col bg-slate-50" lang={localeConfig[params.locale].htmlLang}>
      {children}
      <PublicFooter locale={params.locale} />
    </div>
  );
}
