import Link from "next/link";

import { getDictionary, localeConfig, type Locale } from "@/i18n";
import type { Post } from "@/interfaces/post";

export function PostList({ posts, locale }: { posts: Post[]; locale: Locale }) {
  const dictionary = getDictionary(locale);
  const dateFormatter = new Intl.DateTimeFormat(localeConfig[locale].dateLocale, {
    dateStyle: "long",
  });

  if (posts.length === 0) {
    return <p className="rounded-2xl border border-dashed border-slate-300 p-8 text-slate-600">{dictionary.noPosts}</p>;
  }

  return (
    <div className="space-y-5">
      {posts.map((post) => (
        <article key={post.path} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-slate-500">
            {dictionary.publishedOn} {dateFormatter.format(new Date(post.date))}
          </p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-950">
            <Link href={post.url} className="hover:text-blue-700">{post.title}</Link>
          </h2>
          <p className="mt-3 text-slate-600">{post.summary}</p>
          {post.tags.length > 0 && (
            <ul className="mt-4 flex flex-wrap gap-2" aria-label="tags">
              {post.tags.map((tag) => (
                <li key={tag} className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600">{tag}</li>
              ))}
            </ul>
          )}
        </article>
      ))}
    </div>
  );
}
