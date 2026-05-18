'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'

interface Post {
  id: number
  slug: string
  title: string
  content: string
  image: string | null
}

interface RecentItem {
  slug: string
  title: string
  thumbnail: string | null
}

interface Props {
  slug: string
  basePath: string
}

export default function NewsPost({ slug, basePath }: Props) {
  const [post, setPost] = useState<Post | null>(null)
  const [recent, setRecent] = useState<RecentItem[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    fetch(`/api/news/${slug}`)
      .then((r) => {
        if (r.status === 404) { setNotFound(true); return null }
        return r.json()
      })
      .then((d) => {
        if (!d) return
        setPost(d.post)
        setRecent(d.recent ?? [])
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
  }, [slug])

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <span className="loading loading-spinner loading-lg" />
      </div>
    )
  }

  if (notFound || !post) {
    return (
      <div className="flex flex-col gap-4 max-w-2xl mx-auto w-full">
        <p className="text-base-content/50">Post not found.</p>
        <Link href={basePath} className="btn btn-outline btn-sm w-fit">← Back to News</Link>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 max-w-2xl mx-auto w-full">

      {/* Featured image */}
      {post.image && (
        <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-base-200">
          <Image
            src={post.image}
            alt={post.title}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 672px"
            priority
          />
        </div>
      )}

      {/* Title */}
      <h1
        className="text-3xl font-bold leading-snug"
        dangerouslySetInnerHTML={{ __html: post.title }}
      />

      {/* Content */}
      <div
        className="text-base leading-relaxed text-base-content
          [&_p]:mb-4
          [&_h2]:text-xl [&_h2]:font-bold [&_h2]:mt-6 [&_h2]:mb-2
          [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:mt-4 [&_h3]:mb-2
          [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-4
          [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:mb-4
          [&_li]:mb-1
          [&_a]:text-primary [&_a]:underline
          [&_blockquote]:border-l-4 [&_blockquote]:border-base-300 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:mb-4
          [&_img]:rounded-xl [&_img]:max-w-full [&_img]:my-4"
        dangerouslySetInnerHTML={{ __html: post.content }}
      />

      {/* Other news */}
      {recent.length > 0 && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <p className="font-semibold text-base">Other News</p>
            <div className="flex-1 h-px bg-base-200" />
          </div>
          <div className="flex flex-col gap-3">
            {recent.map((r) => (
              <Link
                key={r.slug}
                href={`${basePath}/${r.slug}`}
                className="flex items-center gap-3 rounded-2xl bg-base-200 p-3 hover:bg-base-300 transition-colors"
              >
                {r.thumbnail && (
                  <div className="relative w-16 h-16 rounded-xl overflow-hidden shrink-0 bg-base-300">
                    <Image
                      src={r.thumbnail}
                      alt={r.title}
                      fill
                      className="object-cover"
                      sizes="64px"
                    />
                  </div>
                )}
                <p
                  className="text-sm font-medium leading-snug line-clamp-2"
                  dangerouslySetInnerHTML={{ __html: r.title }}
                />
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Back button */}
      <div>
        <Link href={basePath} className="btn btn-outline btn-sm">
          ← Back to News
        </Link>
      </div>

    </div>
  )
}
