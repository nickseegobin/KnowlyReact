import { redirect } from 'next/navigation'
import { getTokenFromCookie } from '@/lib/cookies'
import { wpFetch } from '@/lib/wp-api'
import type { AuthUser } from '@/types/knowly'

interface QuestEntry {
  quest_id: string
  module_title?: string
  topic?: string
  subject: string
}

const SUBJECT_SLUG: Record<string, string> = {
  'Mathematics': 'math',
  'English Language Arts': 'english',
  'Language Arts': 'english',
  'Science': 'science',
  'Social Studies': 'social_studies',
}

/**
 * Redirect layer — resolves topic name to a quest_id and bounces to the full
 * topic detail page. Only hit when navigating here without a quest_id.
 */
export default async function TopicTopicPage({
  params,
}: {
  params: Promise<{ subject: string; topic: string }>
}) {
  const { subject: encodedSubject, topic: encodedTopic } = await params
  const subject = decodeURIComponent(encodedSubject)
  const topic = decodeURIComponent(encodedTopic)

  const token = await getTokenFromCookie()
  if (!token) redirect('/login')

  let level = ''
  let period = ''

  try {
    const user = await wpFetch<AuthUser>('/auth/me', 'GET', undefined, token)
    const activeChild = user.children?.find((c) => c.child_id === user.active_child_id) ?? user.children?.[0]
    if (activeChild) {
      level = activeChild.level
      period = activeChild.period
    }
  } catch {}

  try {
    const subjectSlug = SUBJECT_SLUG[subject] ?? subject.toLowerCase().replace(/\s+/g, '_')
    const qs = new URLSearchParams({ subject: subjectSlug })
    if (level) qs.set('level', level)
    if (period) qs.set('period', period)

    const data = await wpFetch<{ quests: QuestEntry[] } | QuestEntry[]>(
      `/quests?${qs}`, 'GET', undefined, token
    )
    const raw: QuestEntry[] = Array.isArray(data) ? data : (data as { quests: QuestEntry[] }).quests ?? []
    const match = raw.find((q) => (q.module_title ?? q.topic ?? '') === topic)

    if (match?.quest_id) {
      redirect(`/child/lessons/${encodedSubject}/${encodedTopic}/${match.quest_id}`)
    }
  } catch {}

  redirect(`/child/lessons/${encodedSubject}`)
}
