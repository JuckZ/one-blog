import { NextResponse, type NextRequest } from "next/server";

import { defaultLocale, isLocale, localeConfig } from "@/i18n";

export function middleware(request: NextRequest) {
  if (process.env.SITE_ENGINE === "quartz") {
    if (
      request.nextUrl.pathname.startsWith("/quartz-render")
      || request.nextUrl.pathname.startsWith("/_next")
      || request.nextUrl.pathname === "/robots.txt"
      || request.nextUrl.pathname === "/sitemap.xml"
    ) {
      return NextResponse.next();
    }
    const segments = request.nextUrl.pathname.split("/").filter(Boolean);
    const pathLocale = isLocale(segments[0]) ? segments[0] : undefined;
    const savedLocale = request.cookies.get("one-blog-lang")?.value;
    const browserPrefersEnglish = request.headers.get("accept-language")?.toLowerCase().startsWith("en") ?? false;
    const preferredLocale = isLocale(savedLocale) ? savedLocale : browserPrefersEnglish ? "en" : defaultLocale;

    if (!pathLocale) {
      const localizedUrl = request.nextUrl.clone();
      localizedUrl.pathname = request.nextUrl.pathname === "/"
        ? `/${preferredLocale}`
        : `/${preferredLocale}${request.nextUrl.pathname}`;
      return NextResponse.redirect(localizedUrl);
    }
    const quartzUrl = request.nextUrl.clone();
    quartzUrl.pathname = "/quartz-render";
    quartzUrl.searchParams.set("__path", request.nextUrl.pathname);
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-one-blog-quartz-path", request.nextUrl.pathname);
    return NextResponse.rewrite(quartzUrl, { request: { headers: requestHeaders } });
  }

  const firstSegment = request.nextUrl.pathname.split("/").filter(Boolean)[0];
  const locale = isLocale(firstSegment) ? firstSegment : defaultLocale;
  const isPublicBlogRoute = isLocale(firstSegment);
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-one-blog-locale", localeConfig[locale].htmlLang);
  requestHeaders.set("x-one-blog-public", isPublicBlogRoute ? "1" : "0");

  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
