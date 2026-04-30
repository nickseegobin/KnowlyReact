'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

// ── Types ─────────────────────────────────────────────────────────────────────

interface TopicItem {
  topic: string
  subject: string
  correct_rate: number | null
}

interface SubjectData {
  subject: string
  trial_count: number
  avg_score: number | null
  topics_covered: number
  topics_strong: number
  topics_weak: number
}

interface TrendPoint {
  label: string
  trial_count: number
  avg_score: number | null
}

interface RetryItem {
  subject: string
  topic: string
  attempts: number
  first_attempt: number
  subsequent_avg: number
  improvement: number
}

interface RecentTrial {
  subject: string
  topic: string | null
  difficulty: string
  percentage: number | null
  completed_at: string
}

interface ChildAnalytics {
  user_id: number
  nickname?: string
  avatar_index?: number
  trial_count: number
  quest_count: number
  avg_score: number | null
  weekly_trials: number
  topics_attempted: number
  at_risk: boolean
  subjects: SubjectData[]
  strengths: TopicItem[]
  weaknesses: TopicItem[]
  trend: TrendPoint[]
  retry_effectiveness: RetryItem[]
  recent_trials: RecentTrial[]
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(val: number | null | undefined): string {
  return val == null ? '—' : `${Math.round(val)}%`
}

function scoreColor(val: number | null | undefined): string {
  if (val == null) return 'text-base-content'
  if (val >= 70) return 'text-success'
  if (val >= 50) return 'text-warning'
  return 'text-error'
}

function relativeDate(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const days = Math.floor(diff / 86400000)
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 7)  return `${days}d ago`
  if (days < 30) return `${Math.floor(days / 7)}w ago`
  return `${Math.floor(days / 30)}mo ago`
}

const DIFFICULTY_LABEL: Record<string, string> = { easy: 'Easy', medium: 'Medium', hard: 'Hard' }
const SUBJECT_EMOJI: Record<string, string> = {
  'Mathematics': '📐', 'English Language Arts': '📖',
  'Language Arts': '📖', 'Science': '🔬', 'Social Studies': '🌍',
}

// ── Sparkline ─────────────────────────────────────────────────────────────────

function Sparkline({ trend }: { trend: TrendPoint[] }) {
  const valid = trend.map((p) => p.avg_score).filter((s): s is number => s !== null)
  if (valid.length < 2) {
    return <p className="text-xs text-base-content/40 italic">Not enough data yet</p>
  }
  const max = Math.max(...valid, 100)
  const min = Math.min(...valid, 0)
  const range = max - min || 1
  const W = 200; const H = 48
  const pts = trend.map((p, i) => ({
    x: (i / (trend.length - 1)) * W,
    y: p.avg_score !== null ? H - ((p.avg_score - min) / range) * H : null,
    ...p,
  }))
  const linePts = pts.filter((p): p is typeof pts[0] & { y: number } => p.y !== null)
  const d = linePts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ')

  return (
    <div className="flex flex-col gap-2">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-12">
        <path d={d} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-primary" />
        {linePts.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="3.5" fill="currentColor" className="text-primary" />
        ))}
      </svg>
      <div className="flex justify-between">
        {trend.map((p, i) => (
          <div key={i} className="flex flex-col items-center gap-0.5">
            <span className={`text-xs font-semibold ${scoreColor(p.avg_score)}`}>{fmt(p.avg_score)}</span>
            <span className="text-[10px] text-base-content/40">{p.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ParentAnalyticsPage() {
  const router = useRouter()

  const [children, setChildren]   = useState<(ChildAnalytics & { nickname: string; avatar_index: number })[]>([])
  const [data, setData]           = useState<ChildAnalytics | null>(null)
  const [activeIdx, setActiveIdx] = useState(0)
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState('')

  useEffect(() => {
    fetch('/api/analytics/self')
      .then((r) => r.json())
      .then((json) => {
        if (json.children) {
          setChildren(json.children)
          setData(json.children[0] ?? null)
        } else {
          setData(json)
        }
      })
      .catch(() => setError('Could not load analytics.'))
      .finally(() => setLoading(false))
  }, [])

  function switchChild(idx: number) {
    setActiveIdx(idx)
    setData(children[idx])
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <span className="loading loading-ring loading-lg text-primary" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="max-w-sm mx-auto px-4 py-12 flex flex-col items-center gap-4 text-center">
        <div className="text-5xl">📊</div>
        <p className="text-base-content/60">{error || 'No activity yet.'}</p>
        <button onClick={() => router.back()} className="btn btn-ghost btn-sm">← Back</button>
      </div>
    )
  }

  const avatar = data.avatar_index ?? 1
  const name   = data.nickname || `Child #${data.user_id}`

  return (
    <div className="max-w-sm mx-auto w-full px-4 py-6 flex flex-col gap-5 animate-fade-in-up">

      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="btn btn-circle btn-sm btn-ghost border border-base-300">‹</button>
        <div>
          <h1 className="text-xl font-bold">Progress Report</h1>
          <p className="text-sm text-base-content/50">How your child is doing</p>
        </div>
      </div>

      {/* Multi-child switcher */}
      {children.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {children.map((c, i) => (
            <button
              key={c.user_id}
              onClick={() => switchChild(i)}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl border shrink-0 transition-all
                ${i === activeIdx ? 'border-primary bg-primary/10' : 'border-base-300 bg-base-200'}`}
            >
              <Image src={`/avatars/children/avatar-${c.avatar_index}.png`} alt={c.nickname} width={24} height={24} className="rounded-full" />
              <span className="text-sm font-medium">{c.nickname}</span>
            </button>
          ))}
        </div>
      )}

      {/* Child identity + overall score */}
      <div className="flex items-center gap-3 bg-base-200 rounded-2xl p-4">
        <Image src={`/avatars/children/avatar-${avatar}.png`} alt={name} width={52} height={52} className="rounded-full border-2 border-base-300" />
        <div className="flex-1 min-w-0">
          <p className="font-bold text-base truncate">{name}</p>
          {data.at_risk
            ? <span className="badge badge-error badge-sm">Needs attention</span>
            : <span className="text-xs text-base-content/50">{data.topics_attempted} topic{data.topics_attempted !== 1 ? 's' : ''} explored</span>
          }
        </div>
        <div className={`text-3xl font-black shrink-0 ${scoreColor(data.avg_score)}`}>{fmt(data.avg_score)}</div>
      </div>

      {/* Activity summary */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { val: data.weekly_trials, label: 'This week', unit: 'trial' },
          { val: data.trial_count,   label: 'All time',  unit: 'trial' },
          { val: data.quest_count,   label: 'Quests',    unit: 'done' },
        ].map(({ val, label, unit }) => (
          <div key={label} className="bg-base-200 rounded-2xl p-3 flex flex-col items-center gap-0.5 text-center">
            <span className="text-2xl font-black">{val}</span>
            <span className="text-[10px] text-base-content/60 leading-tight">{label}<br />{unit}{val !== 1 && unit !== 'done' ? 's' : ''}</span>
          </div>
        ))}
      </div>

      {/* 4-week trend */}
      {data.trend.length > 0 && (
        <div className="bg-base-200 rounded-2xl p-4">
          <p className="font-bold text-sm mb-3">Score Trend</p>
          <Sparkline trend={data.trend} />
        </div>
      )}

      {/* Per-subject */}
      {data.subjects.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="font-bold text-sm">By Subject</p>
          {data.subjects.map((s) => (
            <div key={s.subject} className="bg-base-200 rounded-2xl p-4 flex items-center gap-3">
              <span className="text-2xl shrink-0">{SUBJECT_EMOJI[s.subject] ?? '📚'}</span>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate">{s.subject}</p>
                <p className="text-xs text-base-content/50">
                  {s.trial_count} trial{s.trial_count !== 1 ? 's' : ''}
                  {s.topics_weak > 0 && (
                    <span className="text-error"> · {s.topics_weak} topic{s.topics_weak !== 1 ? 's' : ''} need work</span>
                  )}
                </p>
              </div>
              <span className={`text-lg font-black shrink-0 ${scoreColor(s.avg_score)}`}>{fmt(s.avg_score)}</span>
            </div>
          ))}
        </div>
      )}

      {/* Strengths & Weaknesses */}
      {(data.strengths.length > 0 || data.weaknesses.length > 0) && (
        <div className="grid grid-cols-2 gap-3">
          {data.strengths.length > 0 && (
            <div className="bg-base-200 rounded-2xl p-3 flex flex-col gap-2">
              <p className="text-xs font-bold text-success">Strengths ✓</p>
              {data.strengths.slice(0, 5).map((t, i) => (
                <div key={i} className="flex items-start justify-between gap-1">
                  <p className="text-xs text-base-content/70 leading-snug flex-1 truncate">{t.topic}</p>
                  <span className="text-xs font-bold text-success shrink-0">{fmt(t.correct_rate)}</span>
                </div>
              ))}
            </div>
          )}
          {data.weaknesses.length > 0 && (
            <div className="bg-base-200 rounded-2xl p-3 flex flex-col gap-2">
              <p className="text-xs font-bold text-error">Needs Work ✗</p>
              {data.weaknesses.slice(0, 5).map((t, i) => (
                <div key={i} className="flex items-start justify-between gap-1">
                  <p className="text-xs text-base-content/70 leading-snug flex-1 truncate">{t.topic}</p>
                  <span className="text-xs font-bold text-error shrink-0">{fmt(t.correct_rate)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Improvement tracker */}
      {data.retry_effectiveness.length > 0 && (
        <div className="bg-base-200 rounded-2xl p-4">
          <p className="font-bold text-sm mb-3">Showing Improvement 📈</p>
          <div className="flex flex-col gap-3">
            {data.retry_effectiveness.slice(0, 3).map((r, i) => (
              <div key={i}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-base-content/70 truncate flex-1 pr-2">{r.topic}</span>
                  <span className={`font-semibold shrink-0 ${r.improvement > 0 ? 'text-success' : 'text-base-content/50'}`}>
                    {r.improvement > 0 ? `+${r.improvement}%` : `${r.improvement}%`}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-base-content/50">
                  <span>First: <b className="text-base-content/70">{Math.round(r.first_attempt)}%</b></span>
                  <span>→</span>
                  <span>Now: <b className={r.improvement > 0 ? 'text-success' : 'text-base-content/70'}>{r.subsequent_avg}%</b></span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent activity */}
      {data.recent_trials.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="font-bold text-sm">Recent Trials</p>
          {data.recent_trials.slice(0, 5).map((t, i) => (
            <div key={i} className="bg-base-200 rounded-xl px-4 py-3 flex items-center justify-between">
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{t.subject}</p>
                <p className="text-xs text-base-content/50">
                  {t.topic ? `${t.topic} · ` : ''}{DIFFICULTY_LABEL[t.difficulty] ?? t.difficulty} · {relativeDate(t.completed_at)}
                </p>
              </div>
              <span className={`text-sm font-bold shrink-0 ml-3 ${scoreColor(t.percentage)}`}>{fmt(t.percentage)}</span>
            </div>
          ))}
        </div>
      )}

      {data.trial_count === 0 && data.quest_count === 0 && (
        <div className="bg-base-200 rounded-2xl p-8 text-center text-sm text-base-content/50">
          No activity yet. Encourage your child to start a Quest or Trial!
        </div>
      )}

      <div className="pb-6" />
    </div>
  )
}
