import { NextRequest, NextResponse } from 'next/server'
import { wpFetch, WPApiError } from '@/lib/wp-api'
import { getTokenFromCookie } from '@/lib/cookies'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = await getTokenFromCookie()
    if (!token) return NextResponse.json({ message: 'Unauthenticated' }, { status: 401 })

    const { id } = await params
    const scope = req.nextUrl.searchParams.get('scope') ?? 'self'
    const qs    = new URLSearchParams({ scope })
    const data = await wpFetch(`/notifications/${id}/read?${qs}`, 'POST', undefined, token)
    return NextResponse.json(data)
  } catch (err) {
    if (err instanceof WPApiError) return NextResponse.json({ message: err.message, code: err.code }, { status: err.status })
    return NextResponse.json({ message: 'Failed to mark notification read' }, { status: 500 })
  }
}
