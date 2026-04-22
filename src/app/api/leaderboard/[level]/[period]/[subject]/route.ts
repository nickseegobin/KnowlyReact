import { NextRequest, NextResponse } from 'next/server'
import { wpFetch, WPApiError } from '@/lib/wp-api'
import { getTokenFromCookie } from '@/lib/cookies'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ level: string; period: string; subject: string }> }
) {
  try {
    const token = await getTokenFromCookie()
    if (!token) return NextResponse.json({ message: 'Unauthenticated' }, { status: 401 })

    const { level, period, subject } = await params

    // WP route path captures are named 'standard', 'term', 'subject' — but the
    // handler reads 'level' and 'period' from query params, so pass both ways.
    const qs = new URLSearchParams({ level, period })
    const data = await wpFetch(
      `/leaderboard/${level}/${period}/${subject}?${qs}`,
      'GET',
      undefined,
      token
    )
    return NextResponse.json(data)
  } catch (err) {
    if (err instanceof WPApiError) return NextResponse.json({ message: err.message, code: err.code }, { status: err.status })
    return NextResponse.json({ message: 'Failed to load leaderboard' }, { status: 500 })
  }
}
