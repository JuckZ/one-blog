import { getDictionary, type Locale } from "@/i18n";
import { getPeerSiteUrl } from "@/lib/site";

interface PublicFooterProps {
  locale: Locale;
}

export function PublicFooter({ locale }: PublicFooterProps) {
  const dictionary = getDictionary(locale);
  const peerSiteUrl = getPeerSiteUrl();

  return (
    <footer className="border-t border-slate-200 bg-white text-sm text-slate-600">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-3 px-5 py-6 sm:flex-row sm:items-center sm:justify-between">
        <span>{dictionary.footerNote}</span>
        {peerSiteUrl ? (
          <nav aria-label={dictionary.friendLinks} className="flex flex-wrap items-center gap-2">
            <span>{dictionary.peerSiteIntro}</span>
            <a
              id="one-blog-peer-link"
              href={peerSiteUrl}
              target="_blank"
              rel="friend noopener noreferrer"
              className="font-semibold text-slate-800 underline decoration-slate-300 underline-offset-4 hover:text-blue-700"
            >
              {dictionary.peerSite}
            </a>
          </nav>
        ) : null}
      </div>
    </footer>
  );
}
