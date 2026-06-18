import { NextRequest, NextResponse } from 'next/server'
import { wpFetch, WPApiError } from '@/lib/wp-api'
import { getTokenFromCookie } from '@/lib/cookies'

export async function POST(req: NextRequest) {
  try {
    const token = await getTokenFromCookie()
    if (!token) return NextResponse.json({ message: 'Unauthenticated' }, { status: 401 })

    const scope = req.nextUrl.searchParams.get('scope') ?? 'self'
    const qs    = new URLSearchParams({ scope })
    const data = await wpFetch(`/notifications/read-all?${qs}`, 'POST', undefined, token)
    return NextResponse.json(data)
  } catch (err) {
    if (err instanceof WPApiError) return NextResponse.json({ message: err.message, code: err.code }, { status: err.status })
    return NextResponse.json({ message: 'Failed to mark notifications read' }, { status: 500 })
  }
}
