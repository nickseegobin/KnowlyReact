'use client'

import { use, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Breadcrumb from '@/components/child/Breadcrumb'

interface QuestSection {
  section_id: number | string
  title: string
  type?: 'lesson' | 'quiz' | string
  order?: number
  description?: string
}

interface Quest {
  quest_id: string | number
  title: string
  subject: string
  topic: string
  description?: string
  sections_count: number
  gem_cost: number
  completed?: boolean
  sections?: QuestSection[]
  badge_name?: string
}

interface StartResponse {
  session_id: number | string
  balance_after?: number
}

type Phase = 'loading' | 'detail' | 'starting' | 'running' | 'completing' | 'error'

const SECTION_TYPE_ICON: Record<string, string> = {
  lesson: '📖',
  quiz: '✏️',
  default: '📋',
}

export default function QuestDetailPage({
  params,
}: {
  params: Promise<{ subject: string; topic: string; quest_id: string }>
}) {
  const { subject: encodedSubject, topic: encodedTopic, quest_id } = use(params)
  const subject = decodeURIComponent(encodedSubject)
  const topic = decodeURIComponent(encodedTopic)
  const router = useRouter()

  const [phase, setPhase] = useState<Phase>('loading')
  const [quest, setQuest] = useState<Quest | null>(null)
  const [sessionId, setSessionId] = useState<number | string | null>(null)
  const [currentSectionIdx, setCurrentSectionIdx] = useState(0)
  const [completedSections, setCompletedSections] = useState<Set<number>>(new Set())
  const [error, setError] = useState('')

  // Fetch quest details
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/quests/${quest_id}`)
        if (!res.ok) throw new Error('Failed to load quest')
        const data: Quest = await res.json()
        setQuest(data)
        setPhase('detail')
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load quest')
        setPhase('error')
      }
    }
    load()
  }, [quest_id])

  async function startQuest() {
    if (!quest) return
    setPhase('starting')
    setError('')
    try {
      const res = await fetch('/api/quests/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quest_id: quest.quest_id, source: 'direct' }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.message ?? 'Failed to start quest')
      }
      const data: StartResponse = await res.json()
      setSessionId(data.session_id)
      setCurrentSectionIdx(0)
      setCompletedSections(new Set())
      setPhase('running')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to start quest')
      setPhase('detail')
    }
  }

  async function completeSection() {
    const sections = quest?.sections ?? []
    const newCompleted = new Set(completedSections)
    newCompleted.add(currentSectionIdx)
    setCompletedSections(newCompleted)

    if (currentSectionIdx < sections.length - 1) {
      setCurrentSectionIdx((i) => i + 1)
    } else {
      // All sections done — complete the quest
      setPhase('completing')
      try {
        const res = await fetch('/api/quests/complete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ session_id: sessionId }),
        })
        const data = await res.json()
        // Store result for the results page
        sessionStorage.setItem(
          `quest_result_${quest_id}`,
          JSON.stringify({
            quest_id: quest?.quest_id,
            title: quest?.title,
            subject,
            topic,
            sections_total: sections.length,
            sections_completed: newCompleted.size,
            badge_name: data.badge_name ?? quest?.badge_name ?? null,
            badge_earned: data.badge_earned ?? false,
            gems_awarded: data.gems_awarded ?? 0,
            score: data.score ?? Math.round((newCompleted.size / Math.max(sections.length, 1)) * 100),
            is_first_completion: data.is_first_completion ?? false,
          })
        )
        router.push(
          `/child/quests/${encodedSubject}/${encodedTopic}/${quest_id}/results`
        )
      } catch {
        setError('Could not save your progress. Please try again.')
        setPhase('running')
      }
    }
  }

  const sections = quest?.sections ?? []
  const currentSection = sections[currentSectionIdx]

  // ── Loading ────────────────────────────────────────────────────────────────
  if (phase === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <span className="loading loading-spinner loading-lg text-primary" />
        <p className="text-base-content/60 text-sm">Loading quest…</p>
      </div>
    )
  }

  // ── Error ─────────────────────────────────────────────────────────────────
  if (phase === 'error') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center">
        <div className="text-5xl">😕</div>
        <p className="text-base-content/60">{error || 'Something went wrong.'}</p>
        <Link
          href={`/child/quests/${encodedSubject}/${encodedTopic}`}
          className="btn btn-primary btn-sm"
        >
          Go back
        </Link>
      </div>
    )
  }

  // ── Running ───────────────────────────────────────────────────────────────
  if (phase === 'running' || phase === 'completing') {
    return (
      <div className="flex flex-col gap-4">
        {/* Progress bar */}
        <div className="flex items-center gap-2">
          <div className="flex-1 bg-base-300 rounded-full h-2">
            <div
              className="h-2 rounded-full bg-primary transition-all duration-500"
              style={{ width: `${((completedSections.size) / Math.max(sections.length, 1)) * 100}%` }}
            />
          </div>
          <span className="text-xs text-base-content/50 shrink-0">
            {completedSections.size}/{sections.length}
          </span>
        </div>

        {/* Section title */}
        <div>
          <p className="text-xs text-base-content/40 uppercase tracking-wide">
            Section {currentSectionIdx + 1} of {sections.length}
          </p>
          <h2 className="text-2xl font-bold mt-1">{currentSection?.title ?? 'Section'}</h2>
          {currentSection?.type && (
            <span className="badge badge-ghost badge-sm mt-1">
              {SECTION_TYPE_ICON[currentSection.type] ?? '📋'} {currentSection.type}
            </span>
          )}
        </div>

        {/* Section content placeholder */}
        <div className="rounded-2xl bg-base-200 p-6 min-h-40 flex flex-col items-center justify-center gap-3 text-center">
          <div className="text-4xl">{SECTION_TYPE_ICON[currentSection?.type ?? ''] ?? '📋'}</div>
          {currentSection?.description ? (
            <p className="text-base-content/70 text-sm">{currentSection.description}</p>
          ) : (
            <p className="text-base-content/40 text-sm">
              {currentSection?.type === 'lesson'
                ? 'Read through this lesson carefully.'
                : 'Answer the questions to complete this section.'}
            </p>
          )}
        </div>

        {error && (
          <div className="alert alert-error text-sm py-2">{error}</div>
        )}

        {/* Section list mini-map */}
        {sections.length > 1 && (
          <div className="flex gap-1.5 justify-center flex-wrap">
            {sections.map((s, i) => (
              <div
                key={i}
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                  completedSections.has(i)
                    ? 'bg-success text-success-content'
                    : i === currentSectionIdx
                    ? 'bg-primary text-primary-content'
                    : 'bg-base-300 text-base-content/40'
                }`}
                title={s.title}
              >
                {completedSections.has(i) ? '✓' : i + 1}
              </div>
            ))}
          </div>
        )}

        {/* Next / Finish button */}
        <div className="mt-auto pt-4">
          <button
            className="btn btn-primary w-full"
            onClick={completeSection}
            disabled={phase === 'completing'}
          >
            {phase === 'completing' ? (
              <><span className="loading loading-spinner loading-sm" /> Saving…</>
            ) : currentSectionIdx < sections.length - 1 ? (
              'Next Section →'
            ) : (
              '🎉 Complete Quest'
            )}
          </button>
        </div>
      </div>
    )
  }

  // ── Detail (confirm) ─────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href={`/child/quests/${encodedSubject}/${encodedTopic}`}
          className="btn btn-circle btn-sm btn-ghost border border-base-300"
        >
          ‹
        </Link>
        <Breadcrumb crumbs={[
          { label: 'Home', href: '/child/home' },
          { label: 'Quests', href: '/child/quests' },
          { label: subject, href: `/child/quests/${encodedSubject}` },
          { label: topic, href: `/child/quests/${encodedSubject}/${encodedTopic}` },
          { label: quest?.title ?? '…' },
        ]} />
      </div>

      {/* Quest title */}
      <div>
        <div className="flex gap-2 flex-wrap mb-2">
          <span className="badge badge-ghost badge-sm">{subject}</span>
          <span className="badge badge-ghost badge-sm">{topic}</span>
          {quest?.completed && <span className="badge badge-success badge-sm">✓ Completed</span>}
        </div>
        <h1 className="text-3xl font-bold leading-tight">{quest?.title}</h1>
        {quest?.description && (
          <p className="text-base-content/60 mt-2 text-sm leading-relaxed">{quest.description}</p>
        )}
      </div>

      {/* Sections list */}
      {sections.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-xs text-base-content/40 uppercase tracking-wide font-medium">
            {sections.length} Section{sections.length !== 1 ? 's' : ''}
          </p>
          {sections.map((section, i) => (
            <div
              key={section.section_id ?? i}
              className="flex items-center gap-3 p-3 rounded-xl bg-base-200"
            >
              <div className="w-8 h-8 rounded-lg bg-base-300 flex items-center justify-center text-sm shrink-0">
                {SECTION_TYPE_ICON[section.type ?? ''] ?? '📋'}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium leading-snug">{section.title}</p>
                {section.type && (
                  <p className="text-xs text-base-content/40 capitalize">{section.type}</p>
                )}
              </div>
              <span className="text-base-content/20 text-sm">{i + 1}</span>
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className="alert alert-error text-sm py-2">{error}</div>
      )}

      {/* Sticky bottom CTA */}
      <div className="sticky bottom-0 bg-base-100 pt-3 pb-safe border-t border-base-200 -mx-4 px-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl">💎</span>
            <div>
              <p className="text-sm font-semibold">
                {quest?.gem_cost ?? 0} Blue Gem{(quest?.gem_cost ?? 0) !== 1 ? 's' : ''} to start
              </p>
              {quest?.completed && (
                <p className="text-xs text-success">Free retry — already completed</p>
              )}
            </div>
          </div>
          {quest?.badge_name && (
            <div className="text-right">
              <p className="text-xs text-base-content/40">Badge</p>
              <p className="text-xs font-medium text-warning">🏅 {quest.badge_name}</p>
            </div>
          )}
        </div>

        <button
          className="btn btn-primary w-full"
          onClick={startQuest}
          disabled={phase === 'starting'}
        >
          {phase === 'starting' ? (
            <><span className="loading loading-spinner loading-sm" /> Starting…</>
          ) : (
            '▶ Start Quest'
          )}
        </button>
      </div>
    </div>
  )
}
