'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { PERIODS } from '@/types/knowly'

const SUBJECTS = [
  { value: 'math',           label: 'Math' },
  { value: 'english',        label: 'English' },
  { value: 'science',        label: 'Science' },
  { value: 'social_studies', label: 'Social Studies' },
]

interface TopicItem {
  topic: string
  subject: string
  correct_rate: number | null
}

interface TopicBreakdownItem {
  topic: string
  subject: string
  total_questions: number
  correct_rate: number | null
  is_strength: boolean
  is_weakness: boolean
}

interface RecentTrial {
  subject: string
  topic: string | null
  difficulty: string
  percentage: number | null
  source: string
  completed_at: string
}

interface StudentAnalytics {
  user_id: number
  nickname: string
  level: string
  trial_count: number
  quest_count: number
  badges_earned: number
  avg_score: number | null
  weekly_trials: number
  topics_attempted: number
  strengths: TopicItem[]
  weaknesses: TopicItem[]
  topic_breakdown: TopicBreakdownItem[]
  recent_trials: RecentTrial[]
}

function score(val?: number | null) {
  if (val == null) return '—'
  return `${Math.round(val)}%`
}

function subjectLabel(s: string | null | undefined) {
  if (!s) return '—'
  return SUBJECTS.find((x) => x.value === s)?.label ?? s.replace(/_/g, ' ')
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString('en-TT', { day: 'numeric', month: 'short', year: 'numeric' })
  } catch {
    return iso
  }
}

export default function StudentAnalyticsPage() {
  const router = useRouter()
  const params = useParams()
  const classId  = params.class_id as string
  const userId   = params.user_id as string

  const [period, setPeriod]   = useState('')
  const [subject, setSubject] = useState('')
  const [data, setData]       = useState<StudentAnalytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')

  const fetchAnalytics = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const qs = new URLSearchParams()
      if (period)  qs.set('period', period)
      if (subject) qs.set('subject', subject)
      const res = await fetch(
        `/api/analytics/class/${classId}/student/${userId}${qs.toString() ? `?${qs}` : ''}`
      )
      const json = await res.json()
      if (!res.ok) {
        setError(json.message ?? 'Failed to load analytics.')
      } else {
        setData(json)
      }
    } catch {
      setError('Something went wrong.')
    } finally {
      setLoading(false)
    }
  }, [classId, userId, period, subject])

  useEffect(() => { fetchAnalytics() }, [fetchAnalytics])

  return (
    <div className="flex flex-col gap-6 max-w-2xl mx-auto w-full">
      {/* ── Header ── */}
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-3xl font-bold">{data?.nickname ?? 'Student'}</h1>
          {data?.level && <span className="badge badge-ghost badge-sm">{data.level}</span>}
        </div>
        <p className="text-sm text-base-content/60">Individual performance</p>
      </div>

      {/* ── Filters ── */}
      <div className="flex gap-2 flex-wrap">
        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          className="select select-bordered select-sm"
        >
          <option value="">All Terms</option>
          {PERIODS.map((p) => (
            <option key={p.value} value={p.value}>{p.label}</option>
          ))}
        </select>
        <select
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className="select select-bordered select-sm"
        >
          <option value="">All Subjects</option>
          {SUBJECTS.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
      </div>

      {loading && (
        <div className="flex justify-center py-10">
          <span className="loading loading-spinner loading-md" />
        </div>
      )}

      {error && (
        <div className="bg-base-200 rounded-2xl p-6 text-center text-sm text-error">{error}</div>
      )}

      {!loading && !error && data && (
        <>
          {/* ── Summary stats ── */}
          <div className="flex gap-0 text-center rounded-2xl bg-base-200 overflow-hidden">
            <div className="flex-1 py-4">
              <p className="text-2xl font-bold text-success">{score(data.avg_score)}</p>
              <p className="text-xs text-base-content/50 mt-0.5">Avg Score</p>
            </div>
            <div className="w-px bg-base-300" />
            <div className="flex-1 py-4">
              <p className="text-2xl font-bold">{data.weekly_trials}</p>
              <p className="text-xs text-base-content/50 mt-0.5">This Week</p>
            </div>
            <div className="w-px bg-base-300" />
            <div className="flex-1 py-4">
              <p className="text-2xl font-bold">{data.trial_count}</p>
              <p className="text-xs text-base-content/50 mt-0.5">Trials</p>
            </div>
            <div className="w-px bg-base-300" />
            <div className="flex-1 py-4">
              <p className="text-2xl font-bold">{data.quest_count}</p>
              <p className="text-xs text-base-content/50 mt-0.5">Quests</p>
            </div>
          </div>

          {/* ── Overview section divider + badges ── */}
          <div className="flex items-center gap-3">
            <p className="font-semibold text-base">Overview</p>
            <div className="flex-1 h-px bg-base-200" />
          </div>

          {data.badges_earned > 0 && (
            <div className="bg-base-200 rounded-2xl p-4 flex items-center gap-3">
              <span className="text-2xl">🏅</span>
              <div>
                <p className="font-semibold">{data.badges_earned} Badge{data.badges_earned !== 1 ? 's' : ''}</p>
                <p className="text-xs text-base-content/50">Earned so far</p>
              </div>
            </div>
          )}

          {/* ── Strengths / Weaknesses ── */}
          {(data.strengths.length > 0 || data.weaknesses.length > 0) && (
            <>
              <div className="flex items-center gap-3">
                <p className="font-semibold text-base">Topic Breakdown</p>
                <div className="flex-1 h-px bg-base-200" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                {data.strengths.length > 0 && (
                  <div className="bg-base-200 rounded-2xl p-4">
                    <p className="text-sm font-semibold text-success mb-2">Strengths</p>
                    {data.strengths.map((s, i) => (
                      <div key={i} className="flex items-center justify-between mb-0.5">
                        <p className="text-xs text-base-content/70 truncate">{s.topic}</p>
                        <p className="text-xs font-semibold text-success ml-1 shrink-0">{score(s.correct_rate)}</p>
                      </div>
                    ))}
                  </div>
                )}
                {data.weaknesses.length > 0 && (
                  <div className="bg-base-200 rounded-2xl p-4">
                    <p className="text-sm font-semibold text-error mb-2">Needs Work</p>
                    {data.weaknesses.map((w, i) => (
                      <div key={i} className="flex items-center justify-between mb-0.5">
                        <p className="text-xs text-base-content/70 truncate">{w.topic}</p>
                        <p className="text-xs font-semibold text-error ml-1 shrink-0">{score(w.correct_rate)}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {/* ── Topic breakdown ── */}
          {data.topic_breakdown && data.topic_breakdown.length > 0 && (
            <section className="flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <p className="font-semibold text-base">All Topics</p>
                <div className="flex-1 h-px bg-base-200" />
              </div>
              <div className="flex flex-col gap-2">
                {data.topic_breakdown.map((t, i) => (
                  <div key={i} className="bg-base-200 rounded-2xl p-4">
                    <div className="flex items-center justify-between mb-1">
                      <div>
                        <p className="text-sm font-semibold">{t.topic}</p>
                        <p className="text-xs text-base-content/50">{subjectLabel(t.subject)}</p>
                      </div>
                      <p className="text-sm font-bold">{score(t.correct_rate)}</p>
                    </div>
                    <div className="w-full bg-base-300 rounded-full h-1.5">
                      <div
                        className={`h-1.5 rounded-full ${t.is_strength ? 'bg-success' : t.is_weakness ? 'bg-error' : 'bg-neutral'}`}
                        style={{ width: `${Math.min(100, Math.round(t.correct_rate ?? 0))}%` }}
                      />
                    </div>
                    <p className="text-xs text-base-content/50 mt-1">{t.total_questions} question{t.total_questions !== 1 ? 's' : ''}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ── Recent trials ── */}
          {data.recent_trials && data.recent_trials.length > 0 && (
            <section className="flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <p className="font-semibold text-base">Recent Trials</p>
                <div className="flex-1 h-px bg-base-200" />
              </div>
              <div className="flex flex-col gap-2">
                {data.recent_trials.map((t, i) => (
                  <div key={i} className="bg-base-200 rounded-2xl p-4 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold">
                        {subjectLabel(t.subject)}{t.topic ? ` · ${t.topic}` : ''}
                      </p>
                      <p className="text-xs text-base-content/50">
                        {t.difficulty} · {formatDate(t.completed_at)}
                      </p>
                    </div>
                    <p className="text-sm font-bold">{score(t.percentage)}</p>
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  )
}
