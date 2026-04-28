import { NextRequest, NextResponse } from 'next/server'
import { wpFetch, WPApiError } from '@/lib/wp-api'
import { getTokenFromCookie } from '@/lib/cookies'

export async function POST(req: NextRequest) {
  try {
    const token = await getTokenFromCookie()
    if (!token) return NextResponse.json({ message: 'Unauthenticated' }, { status: 401 })

    const { payment_url } = await req.json()
    if (!payment_url) return NextResponse.json({ message: 'payment_url required' }, { status: 400 })

    const data = await wpFetch<{ autologin_url: string }>(
      '/auth/autologin',
      'POST',
      { payment_url },
      token,
    )
    return NextResponse.json(data)
  } catch (err) {
    if (err instanceof WPApiError) return NextResponse.json({ message: err.message, code: err.code }, { status: err.status })
    return NextResponse.json({ message: 'Failed to generate autologin URL' }, { status: 500 })
  }
}
