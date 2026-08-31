import { redirect } from "next/navigation";
import { cookies, headers } from "next/headers";

import { defaultLocale, isLocale } from "@/i18n";

export default function IndexPage() {
  const savedLocale = cookies().get("one-blog-lang")?.value;
  const browserPrefersEnglish = headers().get("accept-language")?.toLowerCase().startsWith("en") ?? false;
  const locale = isLocale(savedLocale) ? savedLocale : browserPrefersEnglish ? "en" : defaultLocale;
  redirect(`/${locale}`);
}
