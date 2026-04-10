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
 * This page exists only as a redirect layer.
 * The subject page links directly to [topic]/[quest_id], so this page
 * is only hit if someone navigates here manually without a quest_id.
 * In that case, look up the first quest for the topic and redirect.
 */
export default async function QuestTopicPage({
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
      redirect(`/child/quests/${encodedSubject}/${encodedTopic}/${match.quest_id}`)
    }
  } catch {}

  // Fallback — couldn't resolve quest, go back to subject
  redirect(`/child/quests/${encodedSubject}`)
}
