import { redirect } from 'next/navigation'
import { getTokenFromCookie } from '@/lib/cookies'
import { wpFetch } from '@/lib/wp-api'
import Breadcrumb from '@/components/child/Breadcrumb'
import Link from 'next/link'
import type { AuthUser } from '@/types/knowly'

interface QuestEntry {
  quest_id: string
  module_title?: string
  topic?: string
  subject: string
  module_number?: number
}

const SUBJECT_SLUG: Record<string, string> = {
  'Mathematics': 'math',
  'English Language Arts': 'english',
  'Language Arts': 'english',
  'Science': 'science',
  'Social Studies': 'social_studies',
}

function levelLabel(level: string) {
  return level === 'std_4' ? 'Standard 4' : level === 'std_5' ? 'Standard 5' : level
}
function periodLabel(period: string) {
  const map: Record<string, string> = { term_1: 'Term 1', term_2: 'Term 2', term_3: 'Term 3' }
  return map[period] ?? period
}

export default async function QuestSubjectPage({
  params,
}: {
  params: Promise<{ subject: string }>
}) {
  const { subject: encodedSubject } = await params
  const subject = decodeURIComponent(encodedSubject)
  const subjectSlug = SUBJECT_SLUG[subject] ?? subject.toLowerCase().replace(/\s+/g, '_')

  const token = await getTokenFromCookie()
  if (!token) redirect('/login')

  // topic label → first quest_id for that topic
  const topicMap = new Map<string, string>()
  let levelText = ''
  let level = ''
  let period = ''
  let fetchError: string | null = null

  try {
    const user = await wpFetch<AuthUser>('/auth/me', 'GET', undefined, token)
    const activeChild = user.children?.find((c) => c.child_id === user.active_child_id) ?? user.children?.[0]
    if (activeChild) {
      level = activeChild.level
      period = activeChild.period
      levelText = period ? `${levelLabel(level)} | ${periodLabel(period)}` : levelLabel(level)
    }
  } catch (err) {
    console.error('[QuestSubjectPage] /auth/me failed:', err)
  }

  try {
    const qs = new URLSearchParams({ subject: subjectSlug })
    if (level) qs.set('level', level)
    if (period) qs.set('period', period)

    console.log('[QuestSubjectPage] fetching /quests?' + qs.toString())
    const data = await wpFetch<{ quests: QuestEntry[] } | QuestEntry[]>(
      `/quests?${qs}`, 'GET', undefined, token
    )
    console.log('[QuestSubjectPage] raw response:', JSON.stringify(data))
    const raw: QuestEntry[] = Array.isArray(data) ? data : (data as { quests: QuestEntry[] }).quests ?? []
    console.log('[QuestSubjectPage] quests count:', raw.length)

    // Build topic → first quest_id map (one card per topic), filtered to this subject
    for (const q of raw) {
      if (q.subject && q.subject !== subjectSlug) continue
      const label = q.module_title ?? q.topic ?? q.quest_id
      if (label && q.quest_id && !topicMap.has(label)) {
        topicMap.set(label, q.quest_id)
      }
    }
  } catch (err) {
    console.error('[QuestSubjectPage] /quests fetch failed:', err)
    fetchError = err instanceof Error ? err.message : 'Failed to load quests'
  }

  const topics = Array.from(topicMap.entries()) // [ [label, quest_id], ... ]

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <Link href="/child/quests" className="btn btn-circle btn-sm btn-ghost border border-base-300">‹</Link>
        <Breadcrumb crumbs={[
          { label: 'Home', href: '/child/home' },
          { label: 'Quests', href: '/child/quests' },
          { label: subject },
        ]} />
      </div>

      <div>
        <h1 className="text-3xl font-bold">{subject}</h1>
        {levelText && <p className="text-base-content/60">{levelText}</p>}
      </div>

      {topics.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <div className="text-5xl">📚</div>
          {fetchError ? (
            <p className="text-error text-sm">Could not load quests: {fetchError}</p>
          ) : (
            <p className="text-base-content/60 text-sm">No quests available for {subject} yet.<br />Check back soon!</p>
          )}
        </div>
      ) : (
        <>
          <p className="text-sm text-base-content/50">Select a topic to begin</p>
          <div className="flex flex-col gap-3">
            {topics.map(([label, questId]) => (
              <Link
                key={label}
                href={`/child/quests/${encodedSubject}/${encodeURIComponent(label)}/${questId}`}
                className="flex items-center gap-4 p-4 rounded-2xl bg-base-200 hover:bg-base-300 transition-colors group"
              >
                <div className="w-12 h-12 shrink-0 bg-primary/10 rounded-xl flex items-center justify-center text-2xl">
                  📖
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-base">{label}</p>
                  <p className="text-xs text-base-content/50">Tap to start quest</p>
                </div>
                <span className="text-base-content/30 text-lg group-hover:text-base-content/60 transition-colors">›</span>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
