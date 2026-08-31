import { redirect } from "next/navigation";

export default function LegacyPost({ params }: { params: { slug: string } }) {
  redirect(`/zh/posts/${params.slug}`);
}
