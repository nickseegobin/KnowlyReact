'use client'

import { useEffect, useRef, useState } from 'react'
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
const SUBJECT_DISPLAY: Record<string, string> = {
  math: 'Mathematics', english: 'English Language Arts',
  science: 'Science', social_studies: 'Social Studies',
}
const SUBJECT_SHORT_LABEL: Record<string, string> = {
  'Mathematics': 'Maths', 'English Language Arts': 'English',
  'Language Arts': 'English', 'Science': 'Science', 'Social Studies': 'Social Studies',
}
const SUBJECT_THEME: Record<string, { bg: string; border: string; text: string; bar: string; faint: string }> = {
  'Mathematics':           { bg: 'bg-warning/10',   border: 'border-warning/25',   text: 'text-warning',   bar: 'bg-warning',   faint: 'bg-warning/20'   },
  'English Language Arts': { bg: 'bg-info/10',      border: 'border-info/25',      text: 'text-info',      bar: 'bg-info',      faint: 'bg-info/20'      },
  'Language Arts':         { bg: 'bg-info/10',      border: 'border-info/25',      text: 'text-info',      bar: 'bg-info',      faint: 'bg-info/20'      },
  'Science':               { bg: 'bg-success/10',   border: 'border-success/25',   text: 'text-success',   bar: 'bg-success',   faint: 'bg-success/20'   },
  'Social Studies':        { bg: 'bg-secondary/10', border: 'border-secondary/25', text: 'text-secondary', bar: 'bg-secondary', faint: 'bg-secondary/20' },
}
const DEFAULT_THEME = { bg: 'bg-base-200', border: 'border-base-300', text: 'text-base-content', bar: 'bg-primary', faint: 'bg-base-300' }

function normalizeSubject(subj: string): string {
  return SUBJECT_DISPLAY[subj] ?? subj
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
  const [children,        setChildren]        = useState<(ChildAnalytics & { nickname: string; avatar_index: number })[]>([])
  const [data,            setData]            = useState<ChildAnalytics | null>(null)
  const [activeIdx,       setActiveIdx]       = useState(0)
  const [loading,         setLoading]         = useState(true)
  const [error,           setError]           = useState('')
  const [animate,         setAnimate]         = useState(false)
  const [selectedSubject, setSelectedSubject] = useState('')
  const animTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

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
        animTimerRef.current = setTimeout(() => setAnimate(true), 80)
      })
      .catch(() => setError('Could not load analytics.'))
      .finally(() => setLoading(false))
    return () => { if (animTimerRef.current) clearTimeout(animTimerRef.current) }
  }, [])

  function switchChild(idx: number) {
    setActiveIdx(idx)
    setData(children[idx])
    setSelectedSubject('')
    setAnimate(false)
    setTimeout(() => setAnimate(true), 80)
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
      </div>
    )
  }

  const avatar = data.avatar_index ?? 1
  const name   = data.nickname || `Child #${data.user_id}`

  const subjectList = Array.from(new Set([
    ...data.strengths.map(t => normalizeSubject(t.subject)),
    ...data.weaknesses.map(t => normalizeSubject(t.subject)),
    ...data.retry_effectiveness.map(r => normalizeSubject(r.subject)),
  ]))
  const filteredStrengths  = selectedSubject ? data.strengths.filter(t => normalizeSubject(t.subject) === selectedSubject) : data.strengths
  const filteredWeaknesses = selectedSubject ? data.weaknesses.filter(t => normalizeSubject(t.subject) === selectedSubject) : data.weaknesses
  const filteredRetry      = selectedSubject ? data.retry_effectiveness.filter(r => normalizeSubject(r.subject) === selectedSubject) : data.retry_effectiveness.slice(0, 4)
  const hasInsights        = data.strengths.length > 0 || data.weaknesses.length > 0 || data.retry_effectiveness.length > 0

  return (
    <div className="flex flex-col gap-5 max-w-2xl mx-auto w-full">

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Progress Report</h1>
        <p className="text-sm text-base-content/50">How your child is doing</p>
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
      <div className="flex gap-0 text-center rounded-2xl bg-base-200 overflow-hidden">
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

      {/* Score Trend */}
      {data.trend.length > 0 && (
        <>
          <div className="flex items-center gap-3">
            <p className="font-semibold text-base">Score Trend</p>
            <div className="flex-1 h-px bg-base-200" />
          </div>
          <div className="bg-base-200 rounded-2xl p-4">
            <Sparkline trend={data.trend} />
          </div>
        </>
      )}

      {/* Per-subject */}
      {data.subjects.length > 0 && (
        <>
          <div className="flex items-center gap-3">
            <p className="font-semibold text-base">By Subject</p>
            <div className="flex-1 h-px bg-base-200" />
          </div>
          <div className="flex flex-col gap-2">
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
        </>
      )}

      {/* Subject pills — controls all three insight cards */}
      {hasInsights && (
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setSelectedSubject('')}
            className={`btn btn-sm rounded-full ${selectedSubject === '' ? 'btn-primary' : 'btn-ghost border border-base-300'}`}
          >
            All
          </button>
          {subjectList.map(subj => (
            <button
              key={subj}
              onClick={() => setSelectedSubject(subj === selectedSubject ? '' : subj)}
              className={`btn btn-sm rounded-full ${selectedSubject === subj ? 'btn-primary' : 'btn-ghost border border-base-300'}`}
            >
              {SUBJECT_SHORT_LABEL[subj] ?? subj}
            </button>
          ))}
        </div>
      )}

      {/* Strengths — green card */}
      {filteredStrengths.length > 0 && (
        <div className="rounded-2xl p-4 border bg-success/10 border-success/25">
          <p className="font-bold text-sm mb-3 text-success">What they&apos;re great at ✨</p>
          <div className="flex flex-wrap gap-2">
            {filteredStrengths.map((t, i) => (
              <div key={i} className="flex items-center gap-1.5 bg-success/20 border border-success/30 rounded-xl px-3 py-1.5">
                <span className="text-xs font-semibold text-success">{t.topic}</span>
                <span className="text-xs text-success/70">{fmt(t.correct_rate)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Weaknesses — yellow card */}
      {filteredWeaknesses.length > 0 && (
        <div className="rounded-2xl p-4 border bg-warning/10 border-warning/25">
          <p className="font-bold text-sm mb-3 text-base-content">Needs more practice 🎯</p>
          <div className="flex flex-col gap-2">
            {filteredWeaknesses.map((t, i) => {
              const subj  = normalizeSubject(t.subject)
              const theme = SUBJECT_THEME[subj] ?? DEFAULT_THEME
              return (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-base">{SUBJECT_EMOJI[subj] ?? '📚'}</span>
                    <span className="text-sm text-base-content/80 truncate">{t.topic}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <div className={`w-20 h-2 rounded-full overflow-hidden ${theme.faint}`}>
                      <div
                        className={`h-full rounded-full transition-all duration-1000 ${theme.bar}`}
                        style={{ width: animate ? `${Math.min(t.correct_rate ?? 0, 100)}%` : '0%' }}
                      />
                    </div>
                    <span className={`text-xs font-semibold ${theme.text} w-8 text-right`}>{fmt(t.correct_rate)}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Improvement tracker — blue card */}
      {filteredRetry.length > 0 && (
        <div className="rounded-2xl p-4 border bg-info/10 border-info/25">
          <p className="font-bold text-sm mb-3 text-info">Showing improvement 📈</p>
          <div className="flex flex-col gap-3">
            {filteredRetry.map((r, i) => {
              const subj  = normalizeSubject(r.subject)
              const theme = SUBJECT_THEME[subj] ?? DEFAULT_THEME
              return (
                <div key={i}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-base-content/70 truncate flex-1 pr-2">{r.topic}</span>
                    {r.improvement > 0
                      ? <span className={`font-bold shrink-0 ${theme.text}`}>+{r.improvement}% better!</span>
                      : <span className="font-semibold text-base-content/50 shrink-0">{r.improvement}%</span>
                    }
                  </div>
                  <div className="flex items-center gap-1 text-[11px] text-base-content/50">
                    <span>{Math.round(r.first_attempt)}%</span>
                    <div className={`flex-1 h-1.5 rounded-full overflow-hidden mx-1 ${theme.faint}`}>
                      <div
                        className={`h-full rounded-full transition-all duration-1000 ${theme.bar}`}
                        style={{ width: animate ? `${Math.min(r.subsequent_avg, 100)}%` : '0%' }}
                      />
                    </div>
                    <span className={r.improvement > 0 ? `${theme.text} font-semibold` : ''}>{r.subsequent_avg}%</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Recent activity */}
      {data.recent_trials.length > 0 && (
        <>
          <div className="flex items-center gap-3">
            <p className="font-semibold text-base">Recent Trials</p>
            <div className="flex-1 h-px bg-base-200" />
          </div>
          <div className="flex flex-col gap-2">
            {data.recent_trials.slice(0, 5).map((t, i) => (
              <div key={i} className="bg-base-200 rounded-2xl p-4 flex items-center justify-between">
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
        </>
      )}

      {data.trial_count === 0 && data.quest_count === 0 && (
        <div className="bg-base-200 rounded-2xl p-8 text-center text-sm text-base-content/50">
          No activity yet. Encourage your child to start a Quest or Trial!
        </div>
      )}
    </div>
  )
}
