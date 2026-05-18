'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'

interface NewsItem {
  id: number
  slug: string
  title: string
  excerpt: string
  image: string | null
}

function stripHtml(html: string) {
  return html.replace(/<[^>]*>/g, '').trim()
}

interface Props {
  basePath: string
}

export default function NewsArchive({ basePath }: Props) {
  const [posts, setPosts] = useState<NewsItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/news')
      .then((r) => r.json())
      .then((d) => setPosts(d.posts ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <span className="loading loading-spinner loading-lg" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 max-w-2xl mx-auto w-full">
      <h1 className="text-3xl font-bold">News</h1>

      {posts.length === 0 && (
        <p className="text-base-content/50 text-sm">No news posts yet.</p>
      )}

      <div className="flex flex-col gap-6">
        {posts.map((post) => (
          <article key={post.id} className="flex flex-col gap-3">
            {post.image && (
              <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-base-200">
                <Image
                  src={post.image}
                  alt={post.title}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 672px"
                />
              </div>
            )}
            <div className="flex flex-col gap-2">
              <h2
                className="text-lg font-bold leading-snug"
                dangerouslySetInnerHTML={{ __html: post.title }}
              />
              <p className="text-sm text-base-content/60 leading-relaxed line-clamp-3">
                {stripHtml(post.excerpt)}
              </p>
              <div>
                <Link href={`${basePath}/${post.slug}`} className="btn btn-primary btn-sm">
                  Read More
                </Link>
              </div>
            </div>
            <div className="h-px bg-base-200" />
          </article>
        ))}
      </div>
    </div>
  )
}
