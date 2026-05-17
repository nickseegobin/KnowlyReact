import { NextRequest, NextResponse } from 'next/server'
import { wpFetch, WPApiError } from '@/lib/wp-api'
import { getTokenFromCookie } from '@/lib/cookies'

export async function GET(req: NextRequest) {
  try {
    const token = await getTokenFromCookie()
    if (!token) return NextResponse.json({ message: 'Unauthenticated' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const qs = new URLSearchParams()
    const subject = searchParams.get('subject') ?? ''
    const level   = searchParams.get('level')   ?? ''
    const period  = searchParams.get('period')  ?? ''
    if (subject) qs.set('subject', subject)
    if (level)   qs.set('level',   level)
    if (period)  qs.set('period',  period)
    const query = qs.size ? `?${qs}` : ''

    const data = await wpFetch(`/lessons${query}`, 'GET', undefined, token)
    return NextResponse.json(data)
  } catch (err) {
    if (err instanceof WPApiError) return NextResponse.json({ message: err.message, code: err.code }, { status: err.status })
    return NextResponse.json({ message: 'Failed to fetch lessons' }, { status: 500 })
  }
}
