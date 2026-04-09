import { NextRequest, NextResponse } from 'next/server'
import { wpFetch, WPApiError } from '@/lib/wp-api'
import { getTokenFromCookie } from '@/lib/cookies'

async function wpGet<T>(path: string, token: string): Promise<T> {
  return wpFetch<T>(path, 'GET', undefined, token)
}

export async function GET(req: NextRequest) {
  try {
    const token = await getTokenFromCookie()
    if (!token) return NextResponse.json({ message: 'Unauthenticated' }, { status: 401 })

    const { searchParams } = req.nextUrl
    const params = new URLSearchParams()
    for (const [k, v] of searchParams.entries()) params.set(k, v)

    const qs = params.toString() ? `?${params}` : ''
    const data = await wpGet(`/exams${qs}`, token)
    return NextResponse.json(data)
  } catch (err) {
    if (err instanceof WPApiError) return NextResponse.json({ message: err.message }, { status: err.status })
    return NextResponse.json({ message: 'Failed to fetch catalogue' }, { status: 500 })
  }
}
