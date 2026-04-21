import { NextResponse } from 'next/server'
import { wpFetch, WPApiError } from '@/lib/wp-api'
import { getTokenFromCookie } from '@/lib/cookies'

export async function GET() {
  try {
    const token = await getTokenFromCookie()
    if (!token) return NextResponse.json({ unread: 0 })

    const data = await wpFetch('/notifications/count', 'GET', undefined, token)
    return NextResponse.json(data)
  } catch (err) {
    if (err instanceof WPApiError) return NextResponse.json({ message: err.message, code: err.code }, { status: err.status })
    return NextResponse.json({ unread: 0 })
  }
}
