import { NextRequest, NextResponse } from 'next/server'
import { wpAuth, WPApiError } from '@/lib/wp-api'
import { getTokenFromCookie } from '@/lib/cookies'

export async function GET(req: NextRequest) {
  try {
    const token = await getTokenFromCookie()
    if (!token) return NextResponse.json({ message: 'Unauthenticated' }, { status: 401 })

    const data = await wpAuth.me(token)
    return NextResponse.json(data)
  } catch (err) {
    if (err instanceof WPApiError) {
      return NextResponse.json({ message: err.message, code: err.code }, { status: err.status })
    }
    return NextResponse.json({ message: 'Failed to fetch profile' }, { status: 500 })
  }
}
