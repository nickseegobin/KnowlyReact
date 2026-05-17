import { NextRequest, NextResponse } from 'next/server'
import { wpFetch, WPApiError } from '@/lib/wp-api'
import { getTokenFromCookie } from '@/lib/cookies'

export async function GET(req: NextRequest) {
  try {
    const token = await getTokenFromCookie()
    if (!token) return NextResponse.json({ message: 'Unauthenticated' }, { status: 401 })

    const { searchParams } = req.nextUrl
    const qs = new URLSearchParams()
    if (searchParams.get('type'))     qs.set('type',     searchParams.get('type')!)
    if (searchParams.get('page'))     qs.set('page',     searchParams.get('page')!)
    if (searchParams.get('per_page')) qs.set('per_page', searchParams.get('per_page')!)

    const data = await wpFetch(`/analytics/history?${qs}`, 'GET', undefined, token)
    return NextResponse.json(data)
  } catch (err) {
    if (err instanceof WPApiError) return NextResponse.json({ message: err.message, code: err.code }, { status: err.status })
    return NextResponse.json({ message: 'Failed to fetch history' }, { status: 500 })
  }
}
