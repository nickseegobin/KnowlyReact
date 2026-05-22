import { redirect } from 'next/navigation'
import { getTokenFromCookie } from '@/lib/cookies'
import { wpFetch } from '@/lib/wp-api'
import type { AuthUser } from '@/types/knowly'
import Link from 'next/link'
import { SlidersHorizontal } from 'lucide-react'
import {
  SUBJECT_DISPLAY,
  SUBJECT_SHORT,
  subjectsFromProgression,
} from '@/lib/subject-catalogue'

// ── Types ─────────────────────────────────────────────────────────────────────

interface ProgressionTopic {
  topic: string
  module_number: number
  module_title: string | null
  period: string | null
  sort_order: number
  sessions_count: number
  avg_score: number | null
  best_score: number | null
  status: 'not_started' | 'in_progress' | 'weak' | 'mastered'
}

interface SubjectProgression {
  sessions_count: number
  avg_score: number | null
  topics_total: number
  topics_attempted: number
  topics_mastered: number
  coverage_pct: number
  mastery_pct: number
  weak_areas: string[]
  topics: ProgressionTopic[]
}

interface ProgressionData {
  user_id: number
  curriculum: string
  level: string
  period: string | null
  summary: {
    sessions_total: number
    subjects_active: number
    overall_avg_score: number | null
  }
  subjects: Record<string, SubjectProgression>
}

type DisplayStatus = 'in_progress' | 'weak' | 'mastered' | 'locked' | 'available'

// ── Helpers ───────────────────────────────────────────────────────────────────

function levelLabel(level: string) {
  return level === 'std_4' ? 'Standard 4' : level === 'std_5' ? 'Standard 5' : level
}

function periodLabel(period: string) {
  const map: Record<string, string> = { term_1: 'Term 1', term_2: 'Term 2', term_3: 'Term 3' }
  return map[period] ?? period
}

// Topic-level sequential unlock:
// - First topic is always available
// - Each subsequent topic unlocks when the previous is mastered
// This matches per-section play where each sub-topic is its own session.
function computeDisplayStatuses(
  topics: ProgressionTopic[]
): (ProgressionTopic & { displayStatus: DisplayStatus })[] {
  return topics.map((topic, i) => {
    if (topic.status !== 'not_started') return { ...topic, displayStatus: topic.status }
    if (i === 0) return { ...topic, displayStatus: 'available' }
    const prev = topics[i - 1]
    if (prev.status === 'mastered') return { ...topic, displayStatus: 'available' }
    return { ...topic, displayStatus: 'locked' }
  })
}

function topicStyle(status: DisplayStatus) {
  switch (status) {
    case 'mastered':    return { dot: 'bg-success', text: '', badge: 'badge-success', label: 'Done' }
    case 'in_progress': return { dot: 'bg-primary', text: '', badge: 'badge-primary', label: 'In Progress' }
    case 'weak':        return { dot: 'bg-warning', text: '', badge: 'badge-warning', label: 'Needs Practice' }
    case 'available':   return { dot: 'bg-base-content/30', text: '', badge: 'badge-ghost', label: 'Start' }
    case 'locked':      return { dot: 'bg-base-200', text: 'opacity-40', badge: '', label: '' }
  }
}

// wpFetch unwraps json.data, so GET /quests returns { quests: [...] }
interface QuestCatalogueItem {
  quest_id: string
  module_number: string | number
  module_title: string | null
  subject: string
}

interface QuestCatalogueData {
  quests: QuestCatalogueItem[]
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function QuestsPage({
  searchParams,
}: {
  searchParams: Promise<{ subject?: string }>
}) {
  const token = await getTokenFromCookie()
  if (!token) redirect('/login')

  let level = ''
  let period = ''
  let levelText = ''
  let progressionData: ProgressionData | null = null
  let fetchError: string | null = null

  try {
    const user = await wpFetch<AuthUser>('/auth/me', 'GET', undefined, token)
    const activeChild = user.children?.find((c) => c.child_id === user.active_child_id) ?? user.children?.[0]
    if (activeChild) {
      level = activeChild.level ?? ''
      period = activeChild.period ?? ''
      levelText = period
        ? `${levelLabel(level)} · ${periodLabel(period)}`
        : levelLabel(level)
    }
  } catch {}

  if (level) {
    try {
      const qs = new URLSearchParams({ level, curriculum: 'tt_primary' })
      if (period) qs.set('period', period)
      progressionData = await wpFetch<ProgressionData>(
        `/child/progression?${qs}`, 'GET', undefined, token
      )
    } catch (err) {
      fetchError = err instanceof Error ? err.message : 'Failed to load your curriculum path'
    }
  }

  const { subject: subjectParam = '' } = await searchParams

  const availableSubjects = progressionData
    ? subjectsFromProgression(progressionData.subjects)
    : []

  const selectedSubject = availableSubjects.includes(subjectParam as never)
    ? subjectParam
    : (availableSubjects[0] ?? '')

  const subjectData = selectedSubject ? progressionData?.subjects[selectedSubject] : null
  const topicsWithStatus = subjectData ? computeDisplayStatuses(subjectData.topics) : []

  // Fetch quest catalogue and build module_number → quest_id map
  const moduleToQuestId: Record<number, string> = {}
  if (selectedSubject && token) {
    try {
      const qs2 = new URLSearchParams({ subject: selectedSubject })
      if (level)  qs2.set('level',  level)
      if (period) qs2.set('period', period)
      const catalogue = await wpFetch<QuestCatalogueData>(`/quests?${qs2}`, 'GET', undefined, token)
      for (const q of (catalogue?.quests ?? [])) {
        const modNum = Number(q.module_number)
        if (!isNaN(modNum)) moduleToQuestId[modNum] = q.quest_id
      }
    } catch { /* graceful degrade */ }
  }

  // Group topics by module for display, tracking each topic's index within its module
  const moduleGroups: Array<{
    title: string
    modNum: number
    topics: (typeof topicsWithStatus[number] & { sectionIdx: number })[]
  }> = []

  for (const t of topicsWithStatus) {
    const modNum = t.module_number
    const existing = moduleGroups.find((g) => g.modNum === modNum)
    if (existing) {
      existing.topics.push({ ...t, sectionIdx: existing.topics.length })
    } else {
      moduleGroups.push({
        title: t.module_title ?? String(modNum),
        modNum,
        topics: [{ ...t, sectionIdx: 0 }],
      })
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Quests</h1>
        {levelText && (
          <div className="flex items-center gap-2 mt-0.5">
            <p className="text-base-content/60 text-sm">{levelText}</p>
            <Link
              href="/child/settings/content"
              className="flex items-center gap-1 text-xs text-primary/60 hover:text-primary transition-colors font-medium"
            >
              <SlidersHorizontal size={11} />
              Change
            </Link>
          </div>
        )}
      </div>

      {!level && (
        <p className="text-base-content/40 text-sm">No student profile found. Make sure a child account is active.</p>
      )}
      {fetchError && <div className="alert alert-error text-sm py-2">{fetchError}</div>}

      {progressionData && availableSubjects.length === 0 && (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <div className="text-5xl">📚</div>
          <p className="text-base-content/60 text-sm">No curriculum topics found for your level yet.<br />Check back soon!</p>
        </div>
      )}

      {availableSubjects.length > 0 && (
        <>
          {/* Subject selector */}
          <div className="flex gap-2 flex-wrap">
            {availableSubjects.map((subj) => (
              <Link
                key={subj}
                href={`/child/quests?subject=${subj}`}
                className={`btn btn-sm rounded-full ${
                  subj === selectedSubject ? 'btn-primary' : 'btn-ghost border border-base-300'
                }`}
              >
                {SUBJECT_SHORT[subj] ?? subj}
              </Link>
            ))}
          </div>

          {/* Subject banner */}
          {selectedSubject && (
            <div className="flex items-center gap-3">
              <p className="text-xl font-bold">{SUBJECT_DISPLAY[selectedSubject]}</p>
              <div className="flex-1 h-px bg-base-200" />
            </div>
          )}

          {/* Stats bar */}
          {subjectData && (
            <div className="flex gap-0 text-center rounded-2xl bg-base-200 overflow-hidden">
              <div className="flex-1 py-3">
                <p className="text-xl font-bold text-success">{subjectData.mastery_pct}%</p>
                <p className="text-xs text-base-content/50">Mastered</p>
              </div>
              <div className="w-px bg-base-300" />
              <div className="flex-1 py-3">
                <p className="text-xl font-bold">{subjectData.coverage_pct}%</p>
                <p className="text-xs text-base-content/50">Attempted</p>
              </div>
              <div className="w-px bg-base-300" />
              <div className="flex-1 py-3">
                <p className="text-xl font-bold">{subjectData.topics_mastered}/{subjectData.topics_total}</p>
                <p className="text-xs text-base-content/50">Topics</p>
              </div>
            </div>
          )}

          {/* Topic path — grouped by module, individual rows per sub-topic */}
          {moduleGroups.length > 0 && (
            <div className="flex flex-col gap-6">
              {moduleGroups.map(({ title: moduleTitle, modNum, topics: groupTopics }) => {
                const questId = moduleToQuestId[modNum]
                return (
                  <div key={modNum} className="flex flex-col gap-1">
                    {/* Module header */}
                    <p className="text-xs font-bold text-base-content/40 uppercase tracking-wider px-1 mb-1">
                      {moduleTitle}
                    </p>

                    {/* Individual sub-topic rows */}
                    <div className="flex flex-col gap-2">
                      {groupTopics.map((topic) => {
                        const style = topicStyle(topic.displayStatus)
                        const isLocked = topic.displayStatus === 'locked'
                        const href = (!isLocked && questId)
                          ? `/child/quests/${questId}?section=${topic.sectionIdx}&topic=${encodeURIComponent(topic.topic)}&subject=${selectedSubject}`
                          : null

                        const row = (
                          <div className={`flex items-center gap-3 px-4 py-3 rounded-2xl border bg-base-100 border-base-200 ${style.text} ${!isLocked ? 'hover:bg-base-200 transition-colors' : ''}`}>
                            <div className={`w-2 h-2 rounded-full shrink-0 ${style.dot}`} />
                            <span className="flex-1 text-sm font-medium">{topic.topic}</span>
                            {topic.best_score !== null && (
                              <span className="text-xs text-base-content/40 mr-1">{topic.best_score}%</span>
                            )}
                            {isLocked ? (
                              <span className="text-base-content/20 text-xs">🔒</span>
                            ) : style.badge ? (
                              <span className={`badge badge-sm ${style.badge}`}>{style.label}</span>
                            ) : null}
                          </div>
                        )

                        return href ? (
                          <Link key={topic.topic} href={href} className="block">
                            {row}
                          </Link>
                        ) : (
                          <div key={topic.topic}>{row}</div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}
    </div>
  )
}
