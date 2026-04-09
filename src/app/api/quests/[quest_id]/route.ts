import { NextRequest, NextResponse } from 'next/server'
import { wpFetch, WPApiError } from '@/lib/wp-api'
import { getTokenFromCookie } from '@/lib/cookies'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ quest_id: string }> }
) {
  try {
    const token = await getTokenFromCookie()
    if (!token) return NextResponse.json({ message: 'Unauthenticated' }, { status: 401 })

    const { quest_id } = await params
    const data = await wpFetch(`/quests/${quest_id}`, 'GET', undefined, token)
    return NextResponse.json(data)
  } catch (err) {
    if (err instanceof WPApiError) return NextResponse.json({ message: err.message, code: err.code }, { status: err.status })
    return NextResponse.json({ message: 'Failed to fetch quest' }, { status: 500 })
  }
}
