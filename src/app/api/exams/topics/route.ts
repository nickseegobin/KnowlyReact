import { NextRequest, NextResponse } from 'next/server'
import { wpFetch, WPApiError } from '@/lib/wp-api'
import { getTokenFromCookie } from '@/lib/cookies'
import type { AuthUser } from '@/types/knowly'

interface ModulesResponse {
  modules: { module_number: number; module_title: string }[]
}

// GET /api/exams/topics?subject=math[&level=std_4&period=term_1]
//
// When level is supplied explicitly (teacher context) it skips the /auth/me
// child lookup and calls WP /child/modules directly with the provided values.
// When level is omitted (child context) it resolves level/period from the
// authenticated user's active child profile as before.
export async function GET(req: NextRequest) {
  try {
    const token = await getTokenFromCookie()
    if (!token) return NextResponse.json({ message: 'Unauthenticated' }, { status: 401 })

    const url     = new URL(req.url)
    const subject = url.searchParams.get('subject') ?? ''
    if (!subject) return NextResponse.json({ modules: [] })

    let level  = url.searchParams.get('level')  ?? ''
    let period = url.searchParams.get('period') ?? ''

    // Child context: derive level/period from the active child profile
    if (!level) {
      const user = await wpFetch<AuthUser>('/auth/me', 'GET', undefined, token)
      const activeChild =
        user.children?.find((c) => c.child_id === user.active_child_id) ?? user.children?.[0]
      if (!activeChild) return NextResponse.json({ modules: [] })
      level  = activeChild.level
      period = activeChild.period ?? ''
    }

    const qs = new URLSearchParams({ level, subject })
    if (period) qs.set('period', period)

    const data = await wpFetch<ModulesResponse>(`/child/modules?${qs}`, 'GET', undefined, token)
    return NextResponse.json({ modules: data?.modules ?? [] })
  } catch (err) {
    if (err instanceof WPApiError)
      return NextResponse.json({ message: err.message, code: err.code }, { status: err.status })
    return NextResponse.json({ modules: [] })
  }
}
