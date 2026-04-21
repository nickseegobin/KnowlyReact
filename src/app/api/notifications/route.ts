import { NextRequest, NextResponse } from 'next/server'
import { wpFetch, WPApiError } from '@/lib/wp-api'
import { getTokenFromCookie } from '@/lib/cookies'

export async function GET(req: NextRequest) {
  try {
    const token = await getTokenFromCookie()
    if (!token) return NextResponse.json({ message: 'Unauthenticated' }, { status: 401 })

    const unreadOnly = req.nextUrl.searchParams.get('unread_only') ?? 'false'
    const limit      = req.nextUrl.searchParams.get('limit')       ?? '50'
    const offset     = req.nextUrl.searchParams.get('offset')      ?? '0'

    const qs = new URLSearchParams({ unread_only: unreadOnly, limit, offset })
    const data = await wpFetch(`/notifications?${qs}`, 'GET', undefined, token)
    return NextResponse.json(data)
  } catch (err) {
    if (err instanceof WPApiError) return NextResponse.json({ message: err.message, code: err.code }, { status: err.status })
    return NextResponse.json({ message: 'Failed to fetch notifications' }, { status: 500 })
  }
}
