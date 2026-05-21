import { NextResponse } from 'next/server'

// WP_SD_API_BASE lets local dev point to knowley.local while other routes stay on production WP.
const SD_BASE = (process.env.WP_SD_API_BASE ?? process.env.WP_API_BASE ?? '').replace(/\/$/, '')

export async function GET() {
  try {
    const res = await fetch(`${SD_BASE}/sound-design`, {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    })
    if (!res.ok) return NextResponse.json({})
    const json = await res.json()
    return NextResponse.json(json?.data ?? json)
  } catch {
    return NextResponse.json({})
  }
}
