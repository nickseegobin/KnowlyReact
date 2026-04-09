import { NextRequest, NextResponse } from 'next/server'
import { wpFetch, WPApiError } from '@/lib/wp-api'
import { getTokenFromCookie } from '@/lib/cookies'
import type { AuthUser } from '@/types/knowly'

export async function POST(req: NextRequest) {
  try {
    const token = await getTokenFromCookie()
    if (!token) return NextResponse.json({ message: 'Unauthenticated' }, { status: 401 })

    const body = await req.json()

    // Fetch the active child's level + period — required by WP exam start endpoint
    const user = await wpFetch<AuthUser>('/auth/me', 'GET', undefined, token)
    const activeChild = user.children?.find((c) => c.child_id === user.active_child_id) ?? user.children?.[0]

    if (!activeChild) {
      return NextResponse.json({ message: 'No active student profile selected' }, { status: 422 })
    }

    const enrichedBody = {
      ...body,
      level: activeChild.level,
      period: activeChild.period ?? '',
    }

    const data = await wpFetch('/exams/start', 'POST', enrichedBody, token)
    return NextResponse.json(data, { status: 201 })
  } catch (err) {
    if (err instanceof WPApiError) return NextResponse.json({ message: err.message, code: err.code }, { status: err.status })
    return NextResponse.json({ message: 'Failed to start exam' }, { status: 500 })
  }
}
