import { NextRequest, NextResponse } from 'next/server'
import { wpChildren, WPApiError } from '@/lib/wp-api'
import { getTokenFromCookie } from '@/lib/cookies'

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const token = await getTokenFromCookie()
    if (!token) return NextResponse.json({ message: 'Unauthenticated' }, { status: 401 })

    const { id } = await params
    const childId = parseInt(id, 10)
    if (isNaN(childId)) return NextResponse.json({ message: 'Invalid child ID' }, { status: 400 })

    const data = await wpChildren.switchTo(childId, token)
    return NextResponse.json(data)
  } catch (err) {
    if (err instanceof WPApiError) {
      return NextResponse.json({ message: err.message, code: err.code }, { status: err.status })
    }
    return NextResponse.json({ message: 'Failed to switch profile' }, { status: 500 })
  }
}
