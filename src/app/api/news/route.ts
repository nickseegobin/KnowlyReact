import { NextResponse } from 'next/server'

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
  _embedded?: { 'wp:featuredmedia'?: WPMedia[] }
}

function simplify(p: WPPost) {
  const media = p._embedded?.['wp:featuredmedia']?.[0]
  return {
    id: p.id,
    slug: p.slug,
    title: p.title.rendered,
    excerpt: p.excerpt.rendered,
    image: media?.source_url ?? null,
    thumbnail: media?.media_details?.sizes?.medium?.source_url ?? media?.source_url ?? null,
  }
}

export async function GET() {
  try {
    const res = await fetch(
      `${wpV2Base()}/posts?_embed=true&per_page=12&status=publish`,
      { next: { revalidate: 300 } }
    )
    if (!res.ok) return NextResponse.json({ posts: [] })
    const posts: WPPost[] = await res.json()
    return NextResponse.json({ posts: posts.map(simplify) })
  } catch {
    return NextResponse.json({ posts: [] })
  }
}
