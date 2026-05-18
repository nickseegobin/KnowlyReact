import { NextRequest, NextResponse } from 'next/server'

function wpV2Base() {
  return (process.env.WP_API_BASE ?? '').replace('/wp-json/knowly/v1', '/wp-json/wp/v2')
}

interface WPMedia {
  source_url: string
  media_details?: { sizes?: { medium?: { source_url: string } } }
}

interface WPPost {
  id: number
  slug: string
  title: { rendered: string }
  excerpt: { rendered: string }
  content: { rendered: string }
  _embedded?: { 'wp:featuredmedia'?: WPMedia[] }
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  try {
    const base = wpV2Base()
    const [postRes, recentRes] = await Promise.all([
      fetch(`${base}/posts?slug=${slug}&_embed=true&status=publish`, { next: { revalidate: 300 } }),
      fetch(`${base}/posts?_embed=true&per_page=4&status=publish`, { next: { revalidate: 300 } }),
    ])

    const posts: WPPost[] = await postRes.json()
    if (!Array.isArray(posts) || !posts.length) {
      return NextResponse.json({ message: 'Not found' }, { status: 404 })
    }

    const post = posts[0]
    const allRecent: WPPost[] = recentRes.ok ? await recentRes.json() : []
    const recent = allRecent
      .filter((p) => p.slug !== slug)
      .slice(0, 3)
      .map((p) => ({
        slug: p.slug,
        title: p.title.rendered,
        thumbnail: p._embedded?.['wp:featuredmedia']?.[0]?.media_details?.sizes?.medium?.source_url
          ?? p._embedded?.['wp:featuredmedia']?.[0]?.source_url
          ?? null,
      }))

    const media = post._embedded?.['wp:featuredmedia']?.[0]
    return NextResponse.json({
      post: {
        id: post.id,
        slug: post.slug,
        title: post.title.rendered,
        content: post.content.rendered,
        image: media?.source_url ?? null,
      },
      recent,
    })
  } catch {
    return NextResponse.json({ message: 'Failed to load post' }, { status: 500 })
  }
}
