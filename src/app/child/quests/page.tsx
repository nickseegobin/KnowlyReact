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

type DisplayStatus = 'not_started' | 'in_progress' | 'weak' | 'mastered' | 'locked' | 'available'

// ── Constants ─────────────────────────────────────────────────────────────────

function levelLabel(level: string) {
  return level === 'std_4' ? 'Standard 4' : level === 'std_5' ? 'Standard 5' : level
}

function periodLabel(period: string) {
  const map: Record<string, string> = { term_1: 'Term 1', term_2: 'Term 2', term_3: 'Term 3' }
  return map[period] ?? period
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function computeDisplayStatuses(
  topics: ProgressionTopic[]
): (ProgressionTopic & { displayStatus: DisplayStatus })[] {
  return topics.map((topic, i) => {
    if (topic.status !== 'not_started') {
      return { ...topic, displayStatus: topic.status }
    }
    if (i === 0) return { ...topic, displayStatus: 'available' }
    const prev = topics[i - 1]
    if (prev.status === 'mastered') return { ...topic, displayStatus: 'available' }
    return { ...topic, displayStatus: 'locked' }
  })
}

function nodeStyle(status: DisplayStatus) {
  switch (status) {
    case 'mastered':    return { ring: 'bg-success text-success-content', card: 'bg-success/10 border-success/20', badge: 'badge-success', label: 'Mastered' }
    case 'in_progress': return { ring: 'bg-primary text-primary-content', card: 'bg-primary/10 border-primary/20', badge: 'badge-primary', label: 'In Progress' }
    case 'weak':        return { ring: 'bg-warning text-warning-content', card: 'bg-warning/10 border-warning/20', badge: 'badge-warning', label: 'Needs Practice' }
    case 'available':   return { ring: 'bg-base-300 text-base-content',   card: 'bg-base-200 border-base-300',   badge: 'badge-ghost',   label: 'Start' }
    case 'locked':      return { ring: 'bg-base-200 text-base-content/30', card: 'bg-base-100 border-base-200 opacity-50', badge: '', label: 'Locked' }
    default:            return { ring: 'bg-base-300 text-base-content',   card: 'bg-base-200 border-base-300',   badge: 'badge-ghost',   label: 'Start' }
  }
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

  // Group topics hierarchically by module_title
  const moduleGroups: Array<{ title: string; topics: typeof topicsWithStatus }> = []
  for (const t of topicsWithStatus) {
    const key = t.module_title ?? t.topic
    const existing = moduleGroups.find((g) => g.title === key)
    if (existing) existing.topics.push(t)
    else moduleGroups.push({ title: key, topics: [t] })
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

      {fetchError && (
        <div className="alert alert-error text-sm py-2">{fetchError}</div>
      )}

      {progressionData && availableSubjects.length === 0 && (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <div className="text-5xl">📚</div>
          <p className="text-base-content/60 text-sm">
            No curriculum topics found for your level yet.<br />Check back soon!
          </p>
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

          {/* Selected subject banner */}
          {selectedSubject && (
            <div className="flex items-center gap-3">
              <p className="font-semibold text-base">{SUBJECT_DISPLAY[selectedSubject]}</p>
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

          {/* Topic nodes — grouped by module_title */}
          {moduleGroups.length > 0 && (() => {
            let globalIdx = 0
            return (
              <div className="relative flex flex-col gap-0">
                {/* Vertical connector line */}
                <div className="absolute left-[19px] top-10 bottom-10 w-0.5 bg-base-300 z-0 pointer-events-none" />

                {moduleGroups.map(({ title: moduleTitle, topics: groupTopics }, groupIdx) => {
                  const showHeader = groupTopics.length > 1 ||
                    (groupTopics[0].module_title !== null && groupTopics[0].module_title !== groupTopics[0].topic)
                  const subjectLabel = SUBJECT_DISPLAY[selectedSubject] ?? selectedSubject

                  return (
                    <div key={moduleTitle} className={groupIdx > 0 ? 'mt-4' : ''}>
                      {showHeader && (
                        <p className="text-xs font-bold text-base-content/40 uppercase tracking-wider pl-14 pr-2 mb-2">
                          {moduleTitle}
                        </p>
                      )}
                      <div className="flex flex-col gap-2">
                        {groupTopics.map((topic) => {
                          const nodeNum = ++globalIdx
                          const style = nodeStyle(topic.displayStatus)
                          const isLocked = topic.displayStatus === 'locked'
                          const href = `/child/quests/${encodeURIComponent(subjectLabel)}/${encodeURIComponent(topic.topic)}`

                          const cardInner = (
                            <div className={`relative z-10 flex items-center gap-3 p-3 rounded-2xl border ${style.card} ${showHeader ? 'ml-6' : ''}`}>
                              <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${style.ring}`}>
                                {topic.displayStatus === 'mastered' ? '✓' : topic.displayStatus === 'locked' ? '🔒' : nodeNum}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className={`font-semibold text-sm leading-tight ${isLocked ? 'text-base-content/40' : ''}`}>
                                  {topic.topic}
                                </p>
                                {topic.best_score !== null && (
                                  <p className="text-xs text-base-content/50 mt-0.5">Best: {topic.best_score}%</p>
                                )}
                              </div>
                              {style.badge && (
                                <span className={`badge badge-sm shrink-0 ${style.badge}`}>{style.label}</span>
                              )}
                            </div>
                          )

                          return isLocked ? (
                            <div key={topic.topic}>{cardInner}</div>
                          ) : (
                            <Link key={topic.topic} href={href} className="block">
                              {cardInner}
                            </Link>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          })()}
        </>
      )}
    </div>
  )
}
