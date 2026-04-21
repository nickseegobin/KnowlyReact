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

interface StudentSummary {
  user_id: number
  nickname?: string
  level?: string
  avg_score?: number | null
  trial_count: number
  quest_count: number
  weekly_trials: number
  at_risk: boolean
}

interface ClassAnalytics {
  class_id: number
  student_count: number
  total_trials: number
  total_quests: number
  total_badges: number
  class_avg_score: number | null
  most_active_subject: string | null
  avg_engagement_rate: number
  at_risk_count: number
  strengths: TopicItem[]
  weaknesses: TopicItem[]
  students: StudentSummary[]
}

function score(val?: number | null) {
  if (val == null) return '—'
  return `${Math.round(val)}%`
}

function subjectLabel(s: string | null | undefined) {
  if (!s) return '—'
  return SUBJECTS.find((x) => x.value === s)?.label ?? s.replace(/_/g, ' ')
}

export default function ClassAnalyticsPage() {
  const router = useRouter()
  const params = useParams()
  const classId = params.class_id as string

  const [period, setPeriod]   = useState('')
  const [subject, setSubject] = useState('')
  const [data, setData]       = useState<ClassAnalytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')

  const fetchAnalytics = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const qs = new URLSearchParams()
      if (period)  qs.set('period', period)
      if (subject) qs.set('subject', subject)
      const res = await fetch(`/api/analytics/class/${classId}${qs.toString() ? `?${qs}` : ''}`)
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
  }, [classId, period, subject])

  useEffect(() => { fetchAnalytics() }, [fetchAnalytics])

  return (
    <div className="max-w-sm mx-auto w-full px-4 py-6 flex flex-col gap-6">
      {/* ── Header ── */}
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="text-base-content/50 hover:text-base-content">
          ←
        </button>
        <div>
          <h1 className="text-2xl font-bold">Class Analytics</h1>
          <p className="text-sm text-base-content/50">Performance overview</p>
        </div>
      </div>

      {/* ── Filters ── */}
      <div className="grid grid-cols-2 gap-2">
        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          className="select select-bordered select-sm w-full"
        >
          <option value="">All Terms</option>
          {PERIODS.map((p) => (
            <option key={p.value} value={p.value}>{p.label}</option>
          ))}
        </select>
        <select
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className="select select-bordered select-sm w-full"
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
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-base-200 rounded-2xl p-4 flex flex-col gap-1">
              <span className="text-3xl font-bold">{data.student_count}</span>
              <span className="text-xs text-base-content/50">Students</span>
            </div>
            <div className="bg-base-200 rounded-2xl p-4 flex flex-col gap-1">
              <span className="text-3xl font-bold">{score(data.class_avg_score)}</span>
              <span className="text-xs text-base-content/50">Avg Score</span>
            </div>
            <div className="bg-base-200 rounded-2xl p-4 flex flex-col gap-1">
              <span className="text-3xl font-bold">{data.total_trials + data.total_quests}</span>
              <span className="text-xs text-base-content/50">Total Activities</span>
            </div>
            <div className="bg-base-200 rounded-2xl p-4 flex flex-col gap-1">
              <span className="text-3xl font-bold">{data.avg_engagement_rate}</span>
              <span className="text-xs text-base-content/50">Avg Trials / Week</span>
            </div>
          </div>

          {/* ── Insights ── */}
          <div className="bg-base-200 rounded-2xl p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-base-content/60">Most Active Subject</span>
              <span className="text-sm font-semibold">{subjectLabel(data.most_active_subject)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-base-content/60">At Risk</span>
              <span className={`text-sm font-semibold ${data.at_risk_count > 0 ? 'text-error' : ''}`}>
                {data.at_risk_count} student{data.at_risk_count !== 1 ? 's' : ''}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-base-content/60">Badges Earned</span>
              <span className="text-sm font-semibold">{data.total_badges}</span>
            </div>
          </div>

          {/* ── Strengths / Weaknesses ── */}
          {(data.strengths.length > 0 || data.weaknesses.length > 0) && (
            <div className="grid grid-cols-2 gap-3">
              {data.strengths.length > 0 && (
                <div className="bg-base-200 rounded-2xl p-3">
                  <p className="text-xs font-semibold text-success mb-2">Strengths</p>
                  {data.strengths.map((s, i) => (
                    <div key={i} className="flex items-center justify-between mb-0.5">
                      <p className="text-xs text-base-content/70 truncate">{s.topic}</p>
                      <p className="text-xs font-semibold text-success ml-1 shrink-0">{score(s.correct_rate)}</p>
                    </div>
                  ))}
                </div>
              )}
              {data.weaknesses.length > 0 && (
                <div className="bg-base-200 rounded-2xl p-3">
                  <p className="text-xs font-semibold text-error mb-2">Needs Work</p>
                  {data.weaknesses.map((w, i) => (
                    <div key={i} className="flex items-center justify-between mb-0.5">
                      <p className="text-xs text-base-content/70 truncate">{w.topic}</p>
                      <p className="text-xs font-semibold text-error ml-1 shrink-0">{score(w.correct_rate)}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Per-student breakdown ── */}
          {data.students.length > 0 && (
            <section className="flex flex-col gap-3">
              <h2 className="text-sm font-semibold text-base-content/60 uppercase tracking-wide">
                Students
              </h2>
              <div className="flex flex-col gap-2">
                {data.students.map((s) => (
                  <button
                    key={s.user_id}
                    onClick={() => router.push(`/teacher/analytics/${classId}/student/${s.user_id}`)}
                    className="bg-base-200 hover:bg-base-300 transition-colors rounded-xl px-4 py-3 flex items-center justify-between text-left"
                  >
                    <div>
                      <p className="font-semibold text-sm flex items-center gap-2">
                        {s.nickname ?? `Student #${s.user_id}`}
                        {s.at_risk && (
                          <span className="text-xs text-error font-normal">At Risk</span>
                        )}
                      </p>
                      <p className="text-xs text-base-content/50">
                        {s.trial_count} trial{s.trial_count !== 1 ? 's' : ''} · {s.quest_count} quest{s.quest_count !== 1 ? 's' : ''}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold">{score(s.avg_score)}</p>
                      <span className="text-base-content/30 text-sm">›</span>
                    </div>
                  </button>
                ))}
              </div>
            </section>
          )}

          {data.student_count === 0 && (
            <div className="bg-base-200 rounded-2xl p-8 text-center text-sm text-base-content/50">
              No students in this class yet.
            </div>
          )}
        </>
      )}
    </div>
  )
}
