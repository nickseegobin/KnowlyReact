import { NextResponse } from 'next/server'

const DESIGN_BASE = (process.env.WP_API_BASE ?? '').replace(/\/$/, '')

export async function GET() {
  try {
    const res = await fetch(`${DESIGN_BASE}/design`, {
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
