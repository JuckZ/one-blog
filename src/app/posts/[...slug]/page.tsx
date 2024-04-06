import { format, parseISO } from 'date-fns'
import { allBlogs, allJournals } from 'contentlayer/generated'
import { getMDXComponent } from 'next-contentlayer/hooks'
import { notFound } from 'next/navigation';
import { Post } from '../page';

const allPosts = [...allBlogs, ...allJournals];

export const generateStaticParams = async () => allPosts.map((post) => ({ slug: post.slug.split('/') }))

export const generateMetadata = ({ params }: { params: { slug: string[] }}) => {
  const slug = decodeURI(params.slug.join('/'))
  const post = allPosts.find((post) => post.slug === slug)
  if(!post) {
    return
  }
  return { title: post.title }
}

const PostLayout = ({ params }: { params: { slug: string[] } }) => {
  const slug = decodeURI(params.slug.join('/'))
  // TODO Filter out drafts in production
  const postIndex = allPosts.findIndex((post) => post.slug === slug)
  if(postIndex === -1) {
    return notFound()
  }
  // const prev = allPosts[postIndex + 1]
  // const next = allPosts[postIndex - 1]
  const post = allPosts.find((p) => p.slug === slug) as Post

  const Content = getMDXComponent(post.body.code)

  return (
    <article className="py-8 mx-auto max-w-xl">
      <div className="mb-8 text-center">
        <time dateTime={post.createTime} className="mb-1 text-xs text-gray-600">
          {format(parseISO(post.createTime), 'LLLL d, yyyy')}
        </time>
        <h1>{post.title}</h1>
      </div>
      <Content />
      {/* TODO next pre */}
    </article>
  )
}

export default PostLayout
