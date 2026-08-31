import "server-only";

import manifest from "@/generated/published-content.json";
import { isLocale, type Locale } from "@/i18n";
import type { Post } from "@/interfaces/post";

const publishedPosts = manifest.posts as Post[];

export function getPublishedPosts(locale: Locale): Post[] {
  return publishedPosts.filter((post) => post.lang === locale);
}

export function getPost(locale: Locale, slug: string): Post | undefined {
  return getPublishedPosts(locale).find((post) => post.slug === slug);
}

export function getTranslation(post: Post, targetLocale: Locale): Post | undefined {
  if (!post.translationKey) return undefined;
  return getPublishedPosts(targetLocale).find(
    (candidate) => candidate.translationKey === post.translationKey,
  );
}

export function getAllPublishedPosts(): Post[] {
  return publishedPosts;
}

export function assertSupportedLocale(value: string): Locale {
  if (!isLocale(value)) throw new Error(`Unsupported locale: ${value}`);
  return value;
}
