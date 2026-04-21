import { NextResponse } from 'next/server'
import { wpFetch, WPApiError } from '@/lib/wp-api'
import { getTokenFromCookie } from '@/lib/cookies'

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; child_id: string }> }
) {
  try {
    const token = await getTokenFromCookie()
    if (!token) return NextResponse.json({ message: 'Unauthenticated' }, { status: 401 })

    const { id, child_id } = await params
    const data = await wpFetch(`/classes/${id}/members/${child_id}`, 'DELETE', undefined, token)
    return NextResponse.json(data)
  } catch (err) {
    if (err instanceof WPApiError) return NextResponse.json({ message: err.message, code: err.code }, { status: err.status })
    return NextResponse.json({ message: 'Failed to remove member' }, { status: 500 })
  }
}
