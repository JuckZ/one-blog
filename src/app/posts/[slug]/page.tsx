import { redirect } from "next/navigation";

export default async function LegacyPost({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  redirect(`/zh/posts/${slug}`);
}
