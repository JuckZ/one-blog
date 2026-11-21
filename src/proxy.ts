import { NextResponse, type NextRequest } from "next/server";

import { defaultLocale, isLocale, localeConfig } from "@/i18n";

export function proxy(request: NextRequest) {
  const isQuartz = process.env.SITE_ENGINE === "quartz";
  const requestedPathname = request.nextUrl.pathname;
  const isDefaultFeed = requestedPathname === "/rss.xml" || (isQuartz && requestedPathname === "/index.xml");
  const defaultFeedUrl = isDefaultFeed ? request.nextUrl.clone() : undefined;
  if (defaultFeedUrl) defaultFeedUrl.pathname = `/${defaultLocale}/rss.xml`;

  const { pathname } = defaultFeedUrl ?? request.nextUrl;
  const [firstSegment] = pathname.split("/").filter(Boolean);
  const pathLocale = isLocale(firstSegment) ? firstSegment : undefined;

  if (isQuartz) {
    if (
      pathname.startsWith("/quartz-render")
      || pathname.startsWith("/_next")
      || pathname === "/robots.txt"
      || pathname === "/sitemap.xml"
    ) {
      return NextResponse.next();
    }
    if (!pathLocale) {
      const savedLocale = request.cookies.get("one-blog-lang")?.value;
      const browserPrefersEnglish = request.headers.get("accept-language")?.toLowerCase().startsWith("en") ?? false;
      const preferredLocale = isLocale(savedLocale) ? savedLocale : browserPrefersEnglish ? "en" : defaultLocale;

      const localizedUrl = request.nextUrl.clone();
      localizedUrl.pathname = pathname === "/" ? `/${preferredLocale}` : `/${preferredLocale}${pathname}`;
      return NextResponse.redirect(localizedUrl);
    }
    const quartzUrl = request.nextUrl.clone();
    quartzUrl.pathname = "/quartz-render";
    quartzUrl.searchParams.set("__path", pathname);
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-one-blog-quartz-path", pathname);
    return NextResponse.rewrite(quartzUrl, { request: { headers: requestHeaders } });
  }

  const locale = pathLocale ?? defaultLocale;
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-one-blog-locale", localeConfig[locale].htmlLang);
  requestHeaders.set("x-one-blog-public", pathLocale ? "1" : "0");

  const options = { request: { headers: requestHeaders } };
  return defaultFeedUrl ? NextResponse.rewrite(defaultFeedUrl, options) : NextResponse.next(options);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
