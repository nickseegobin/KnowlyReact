import { NextRequest, NextResponse } from 'next/server'
import { wpFetch, WPApiError } from '@/lib/wp-api'
import { getTokenFromCookie } from '@/lib/cookies'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ order_id: string }> }
) {
  try {
    const token = await getTokenFromCookie()
    if (!token) return NextResponse.json({ message: 'Unauthenticated' }, { status: 401 })
    const { order_id } = await params
    const key = req.nextUrl.searchParams.get('key') ?? ''
    const qs = key ? `?key=${encodeURIComponent(key)}` : ''
    const data = await wpFetch(`/gems/orders/${order_id}/stripe-intent${qs}`, 'GET', undefined, token)
    return NextResponse.json(data)
  } catch (err) {
    if (err instanceof WPApiError) return NextResponse.json({ message: err.message, code: err.code }, { status: err.status })
    return NextResponse.json({ message: 'Failed to fetch Stripe intent' }, { status: 500 })
  }
}
