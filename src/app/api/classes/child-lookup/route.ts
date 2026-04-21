import { NextRequest, NextResponse } from 'next/server'
import { wpFetch, WPApiError } from '@/lib/wp-api'
import { getTokenFromCookie } from '@/lib/cookies'

export async function GET(req: NextRequest) {
  try {
    const token = await getTokenFromCookie()
    if (!token) return NextResponse.json({ message: 'Unauthenticated' }, { status: 401 })

    const q          = req.nextUrl.searchParams.get('q')          ?? ''
    const first_name = req.nextUrl.searchParams.get('first_name') ?? ''
    const last_name  = req.nextUrl.searchParams.get('last_name')  ?? ''

    const hasQ  = q.length >= 2
    const hasFn = first_name.length >= 2
    const hasLn = last_name.length >= 2

    if (!hasQ && !hasFn && !hasLn) {
      return NextResponse.json({ message: 'At least one search field must be 2 or more characters.' }, { status: 400 })
    }

    const qs = new URLSearchParams()
    if (hasQ)  qs.set('q',          q)
    if (hasFn) qs.set('first_name', first_name)
    if (hasLn) qs.set('last_name',  last_name)

    const data = await wpFetch(`/classes/child-lookup?${qs}`, 'GET', undefined, token)
    return NextResponse.json(data)
  } catch (err) {
    if (err instanceof WPApiError) return NextResponse.json({ message: err.message, code: err.code }, { status: err.status })
    return NextResponse.json({ message: 'Failed to search students' }, { status: 500 })
  }
}
