import { redirect } from 'next/navigation'
import { getTokenFromCookie } from '@/lib/cookies'
import { wpFetch } from '@/lib/wp-api'
import Breadcrumb from '@/components/child/Breadcrumb'
import Link from 'next/link'
import type { AuthUser } from '@/types/knowly'

interface QuestEntry {
  quest_id:      string
  module_title?: string
  topic?:        string
  subject:       string
  module_number?: number
  sort_order?:   number | null
}

const SUBJECT_SLUG: Record<string, string> = {
  'Mathematics':          'math',
  'English Language Arts': 'english',
  'Language Arts':        'english',
  'Science':              'science',
  'Social Studies':       'social_studies',
}

function levelLabel(level: string) {
  return level === 'std_4' ? 'Standard 4' : level === 'std_5' ? 'Standard 5' : level
}
function periodLabel(period: string) {
  const map: Record<string, string> = { term_1: 'Term 1', term_2: 'Term 2', term_3: 'Term 3' }
  return map[period] ?? period
}

// Returns the label shown on the card for an individual quest
function questLabel(q: QuestEntry): string {
  return q.topic ?? q.module_title ?? q.quest_id
}

// Returns the group header (General Topic) for a quest
function groupKey(q: QuestEntry): string {
  return q.module_title ?? q.topic ?? 'Other'
}

export default async function QuestSubjectPage({
  params,
}: {
  params: Promise<{ subject: string }>
}) {
  const { subject: encodedSubject } = await params
  const subject     = decodeURIComponent(encodedSubject)
  const subjectSlug = SUBJECT_SLUG[subject] ?? subject.toLowerCase().replace(/\s+/g, '_')

  const token = await getTokenFromCookie()
  if (!token) redirect('/login')

  // Ordered groups: Map<groupLabel, QuestEntry[]>
  const groups = new Map<string, QuestEntry[]>()
  let levelText   = ''
  let level       = ''
  let period      = ''
  let fetchError: string | null = null

  try {
    const user = await wpFetch<AuthUser>('/auth/me', 'GET', undefined, token)
    const activeChild = user.children?.find((c) => c.child_id === user.active_child_id) ?? user.children?.[0]
    if (activeChild) {
      level     = activeChild.level
      period    = activeChild.period
      levelText = period ? `${levelLabel(level)} | ${periodLabel(period)}` : levelLabel(level)
    }
  } catch (err) {
    console.error('[QuestSubjectPage] /auth/me failed:', err)
  }

  try {
    const qs = new URLSearchParams({ subject: subjectSlug })
    if (level)  qs.set('level', level)
    if (period) qs.set('period', period)

    const data = await wpFetch<{ quests: QuestEntry[] } | QuestEntry[]>(
      `/quests?${qs}`, 'GET', undefined, token
    )
    const raw: QuestEntry[] = Array.isArray(data) ? data : (data as { quests: QuestEntry[] }).quests ?? []

    for (const q of raw) {
      if (q.subject && q.subject !== subjectSlug) continue
      const group = groupKey(q)
      if (!groups.has(group)) groups.set(group, [])
      groups.get(group)!.push(q)
    }
  } catch (err) {
    console.error('[QuestSubjectPage] /quests fetch failed:', err)
    fetchError = err instanceof Error ? err.message : 'Failed to load quests'
  }

  const totalQuests = Array.from(groups.values()).reduce((n, g) => n + g.length, 0)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <Link href="/child/quests" className="btn btn-circle btn-sm btn-ghost border border-base-300">‹</Link>
        <Breadcrumb crumbs={[
          { label: 'Home',   href: '/child/home' },
          { label: 'Quests', href: '/child/quests' },
          { label: subject },
        ]} />
      </div>

      <div>
        <h1 className="text-3xl font-bold">{subject}</h1>
        {levelText && <p className="text-base-content/60">{levelText}</p>}
      </div>

      {totalQuests === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <div className="text-5xl">📚</div>
          {fetchError ? (
            <p className="text-error text-sm">Could not load quests: {fetchError}</p>
          ) : (
            <p className="text-base-content/60 text-sm">
              No quests available for {subject} yet.<br />Check back soon!
            </p>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {Array.from(groups.entries()).map(([groupLabel, quests]) => {
            const isSingleQuest = quests.length === 1 && questLabel(quests[0]) === groupLabel

            // Single quest with no subtopics — show as a plain card (legacy module quests)
            if (isSingleQuest) {
              const q = quests[0]
              return (
                <Link
                  key={q.quest_id}
                  href={`/child/quests/${encodedSubject}/${encodeURIComponent(questLabel(q))}/${q.quest_id}`}
                  className="flex items-center gap-4 p-4 rounded-2xl bg-base-200 hover:bg-base-300 transition-colors group"
                >
                  <div className="w-12 h-12 shrink-0 bg-primary/10 rounded-xl flex items-center justify-center text-2xl">
                    📖
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-base">{groupLabel}</p>
                    <p className="text-xs text-base-content/50">Tap to start quest</p>
                  </div>
                  <span className="text-base-content/30 text-lg group-hover:text-base-content/60 transition-colors">›</span>
                </Link>
              )
            }

            // Multiple subtopic quests under one General Topic — show grouped
            return (
              <div key={groupLabel} className="flex flex-col gap-2">
                <p className="text-xs font-bold text-base-content/40 uppercase tracking-wider px-1">
                  {groupLabel}
                </p>
                {quests.map((q) => (
                  <Link
                    key={q.quest_id}
                    href={`/child/quests/${encodedSubject}/${encodeURIComponent(questLabel(q))}/${q.quest_id}`}
                    className="flex items-center gap-4 p-4 rounded-2xl bg-base-200 hover:bg-base-300 transition-colors group"
                  >
                    <div className="w-10 h-10 shrink-0 bg-primary/10 rounded-xl flex items-center justify-center text-lg">
                      📖
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-sm">{questLabel(q)}</p>
                      <p className="text-xs text-base-content/50">Tap to start quest</p>
                    </div>
                    <span className="text-base-content/30 text-lg group-hover:text-base-content/60 transition-colors">›</span>
                  </Link>
                ))}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
