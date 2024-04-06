import Link from "next/link";
import { compareDesc, format, parseISO } from "date-fns";
import ListLayout from '@/components/themed-layout/list-layout'
import { allBlogs, allJournals } from "contentlayer/generated";
import { allCoreContent, sortPosts } from 'pliny/utils/contentlayer'
import { getMDXComponent } from "next-contentlayer/hooks";
import { genPageMetadata } from '@/app/seo'
import { Post } from '@/interfaces/post'

const allPosts = [...allBlogs, ...allJournals];
const POSTS_PER_PAGE = 5
export const metadata = genPageMetadata({ title: 'Blog' })

function PostCard(post: Post) {
  const Content = getMDXComponent(post.body.code);

  return (
    <div className="mb-8">
      <h2 className="text-4xl">
        {/* TODO Link legacyBehavior 作用*/}
        <Link
          href={post.url}
          className="text-blue-700 hover:text-blue-900">
          {post.title}
        </Link>
      </h2>
      <time dateTime={post.createTime} className="block mb-2 text-xs text-gray-600">
        {format(parseISO(post.createTime), "LLLL d, yyyy")}
      </time>
      {/* TODO 增加Tag Category keyword summary等 */}
      <div className="text-sm">
        <Content />
      </div>
    </div>
  );
}

export function Home() {
  const posts = allPosts.sort((a, b) =>
    compareDesc(new Date(a.createTime), new Date(b.createTime))
  );

  return (
    <div className="max-w-xl py-8 mx-auto">
      <h1 className="mb-8 text-3xl font-bold text-center">One Blog</h1>

      {posts.map((post, idx) => (
        <PostCard key={idx} {...post} />
      ))}
    </div>
  );
}

export default function PostPage() {
  const posts = allCoreContent(sortPosts(allPosts))
  const pageNumber = 1
  const initialDisplayPosts = posts.slice(
    POSTS_PER_PAGE * (pageNumber - 1),
    POSTS_PER_PAGE * pageNumber
  )
  const pagination = {
    currentPage: pageNumber,
    totalPages: Math.ceil(posts.length / POSTS_PER_PAGE),
  }

  return (
    <ListLayout
      posts={posts}
      initialDisplayPosts={initialDisplayPosts}
      pagination={pagination}
      title="All Posts"
    />
  )
}