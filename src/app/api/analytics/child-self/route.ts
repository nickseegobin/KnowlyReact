import { NextRequest, NextResponse } from 'next/server'
import { wpFetch, WPApiError } from '@/lib/wp-api'
import { getTokenFromCookie } from '@/lib/cookies'

export async function GET(req: NextRequest) {
  try {
    const token = await getTokenFromCookie()
    if (!token) return NextResponse.json({ message: 'Unauthenticated' }, { status: 401 })

    const period  = req.nextUrl.searchParams.get('period')  ?? ''
    const subject = req.nextUrl.searchParams.get('subject') ?? ''

    const qs = new URLSearchParams()
    if (period)  qs.set('period', period)
    if (subject) qs.set('subject', subject)

    const path = `/analytics/child-self${qs.toString() ? `?${qs}` : ''}`
    const data = await wpFetch(path, 'GET', undefined, token)
    return NextResponse.json(data)
  } catch (err) {
    if (err instanceof WPApiError) return NextResponse.json({ message: err.message, code: err.code }, { status: err.status })
    return NextResponse.json({ message: 'Failed to fetch analytics' }, { status: 500 })
  }
}
