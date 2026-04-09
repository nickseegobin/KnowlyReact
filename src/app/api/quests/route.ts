import { NextRequest, NextResponse } from 'next/server'
import { wpFetch, WPApiError } from '@/lib/wp-api'
import { getTokenFromCookie } from '@/lib/cookies'

export async function GET(req: NextRequest) {
  try {
    const token = await getTokenFromCookie()
    if (!token) return NextResponse.json({ message: 'Unauthenticated' }, { status: 401 })

    const SUBJECT_SLUG: Record<string, string> = {
      'Mathematics': 'math',
      'English Language Arts': 'english',
      'Language Arts': 'english',
      'Science': 'science',
      'Social Studies': 'social_studies',
    }
    const { searchParams } = new URL(req.url)
    const rawSubject = searchParams.get('subject') ?? ''
    const subject = SUBJECT_SLUG[rawSubject] ?? rawSubject
    const topic = searchParams.get('topic') ?? ''
    const level = searchParams.get('level') ?? ''
    const period = searchParams.get('period') ?? ''
    const qs = new URLSearchParams()
    if (subject) qs.set('subject', subject)
    if (topic) qs.set('topic', topic)
    if (level) qs.set('level', level)
    if (period) qs.set('period', period)
    const query = qs.size ? `?${qs}` : ''

    const data = await wpFetch(`/quests${query}`, 'GET', undefined, token)
    return NextResponse.json(data)
  } catch (err) {
    if (err instanceof WPApiError) return NextResponse.json({ message: err.message, code: err.code }, { status: err.status })
    return NextResponse.json({ message: 'Failed to fetch quests' }, { status: 500 })
  }
}
