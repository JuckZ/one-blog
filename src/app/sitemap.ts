import type { MetadataRoute } from "next";

import { getAllPublishedPosts } from "@/lib/content";
import { getSiteUrl } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = getSiteUrl();
  const quartzMode = process.env.SITE_ENGINE === "quartz";
  const staticPages = quartzMode ? ["/zh", "/en"] : ["/zh", "/en", "/zh/posts", "/en/posts"];
  const entries = new Map<string, MetadataRoute.Sitemap[number]>();
  for (const route of staticPages) entries.set(route, { url: new URL(route, baseUrl).toString() });
  for (const post of getAllPublishedPosts()) {
    const route = quartzMode ? post.quartzUrl : post.url;
    entries.set(route, { url: new URL(route, baseUrl).toString(), lastModified: post.date });
  }
  return [...entries.values()];
}
