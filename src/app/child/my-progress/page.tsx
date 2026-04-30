'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Breadcrumb from '@/components/child/Breadcrumb'

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
  trial_count: number
  quest_count: number
  avg_score: number | null
  weekly_trials: number
  topics_attempted: number
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

function heroTier(avg: number | null): { label: string; emoji: string; color: string; bg: string } {
  if (avg == null) return { label: "Let's get started!", emoji: '🚀', color: 'text-primary',      bg: 'bg-primary/10 border-primary/20' }
  if (avg >= 90)   return { label: 'You\'re on fire!',   emoji: '🔥', color: 'text-warning',      bg: 'bg-warning/10 border-warning/20' }
  if (avg >= 70)   return { label: 'You\'re crushing it!', emoji: '⭐', color: 'text-success',    bg: 'bg-success/10 border-success/20' }
  if (avg >= 50)   return { label: 'Good progress!',     emoji: '👍', color: 'text-primary',      bg: 'bg-primary/10 border-primary/20' }
  return               { label: 'Keep pushing!',         emoji: '💪', color: 'text-base-content', bg: 'bg-base-200 border-base-300' }
}

const SUBJECT_EMOJI: Record<string, string> = {
  'Mathematics': '📐', 'English Language Arts': '📖',
  'Language Arts': '📖', 'Science': '🔬', 'Social Studies': '🌍',
}

const DIFFICULTY_LABEL: Record<string, string> = { easy: 'Easy', medium: 'Medium', hard: 'Hard' }

// ── Score count-up ────────────────────────────────────────────────────────────

function useCountUp(target: number, active: boolean): number {
  const [val, setVal] = useState(0)
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    if (!active || target === 0) return
    let start: number
    const step = (ts: number) => {
      if (!start) start = ts
      const pct = Math.min((ts - start) / 800, 1)
      setVal(Math.round(pct * target))
      if (pct < 1) rafRef.current = requestAnimationFrame(step)
    }
    rafRef.current = requestAnimationFrame(step)
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [target, active])

  return val
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function MyProgressPage() {
  const router = useRouter()

  const [data, setData]       = useState<ChildAnalytics | null>(null)
  const [animate, setAnimate] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')

  useEffect(() => {
    fetch('/api/analytics/child-self')
      .then((r) => r.json())
      .then((json) => {
        setData(json)
        setTimeout(() => setAnimate(true), 80)
      })
      .catch(() => setError('Could not load your progress.'))
      .finally(() => setLoading(false))
  }, [])

  const displayScore = useCountUp(Math.round(data?.avg_score ?? 0), animate && data !== null)

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <span className="loading loading-ring loading-lg text-primary" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center px-4">
        <div className="text-5xl">📊</div>
        <p className="text-base-content/60">{error || 'No progress yet — go complete a Quest or Trial!'}</p>
        <button onClick={() => router.push('/child/home')} className="btn btn-primary btn-sm">Go Home</button>
      </div>
    )
  }

  const tier = heroTier(data.avg_score)
  const hasActivity = data.trial_count > 0 || data.quest_count > 0

  return (
    <div className={`flex flex-col gap-4 pb-8 transition-all duration-500 ${animate ? 'opacity-100' : 'opacity-0'}`}>

      {/* Nav */}
      <div className="flex items-center gap-3">
        <button onClick={() => router.push('/child/home')} className="btn btn-circle btn-sm btn-ghost border border-base-300">‹</button>
        <Breadcrumb crumbs={[
          { label: 'Home', href: '/child/home' },
          { label: 'My Progress' },
        ]} />
      </div>

      {/* Hero banner */}
      <div className={`flex flex-col items-center gap-2 py-5 rounded-2xl border ${tier.bg}`}>
        <div className={`text-5xl ${animate ? 'animate-bounce' : ''}`}>{tier.emoji}</div>
        <p className={`text-xl font-black ${tier.color}`}>{tier.label}</p>
        {data.avg_score !== null && (
          <p className={`text-4xl font-black ${tier.color}`}>{displayScore}%</p>
        )}
        <p className="text-xs text-base-content/50">Overall average score</p>
      </div>

      {/* Activity counters */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { val: data.weekly_trials, label: 'This week', unit: 'trial' },
          { val: data.trial_count,   label: 'Trials',    unit: 'done' },
          { val: data.quest_count,   label: 'Quests',    unit: 'done' },
        ].map(({ val, label, unit }) => (
          <div key={label} className="bg-base-200 rounded-2xl p-3 flex flex-col items-center gap-0.5 text-center">
            <span className="text-2xl font-black">{val}</span>
            <span className="text-[10px] text-base-content/60 leading-tight">{label}<br />{unit}{val !== 1 && unit !== 'done' ? 's' : ''}</span>
          </div>
        ))}
      </div>

      {/* Strengths — celebratory */}
      {data.strengths.length > 0 && (
        <div className="bg-base-200 rounded-2xl p-4">
          <p className="font-bold text-sm mb-3 text-success">What you&apos;re great at ✨</p>
          <div className="flex flex-wrap gap-2">
            {data.strengths.map((t, i) => (
              <div key={i} className="flex items-center gap-1.5 bg-success/10 border border-success/20 rounded-xl px-3 py-1.5">
                <span className="text-xs font-semibold text-success">{t.topic}</span>
                <span className="text-xs text-success/70">{fmt(t.correct_rate)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Weaknesses — framed as challenges */}
      {data.weaknesses.length > 0 && (
        <div className="bg-base-200 rounded-2xl p-4">
          <p className="font-bold text-sm mb-3 text-warning">Level up these topics 🎯</p>
          <div className="flex flex-col gap-2">
            {data.weaknesses.map((t, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-base">{SUBJECT_EMOJI[t.subject] ?? '📚'}</span>
                  <span className="text-sm text-base-content/80 truncate">{t.topic}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <progress className="progress progress-warning w-20 h-2" value={t.correct_rate ?? 0} max={100} />
                  <span className="text-xs font-semibold text-warning w-8 text-right">{fmt(t.correct_rate)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Improvement tracker */}
      {data.retry_effectiveness.length > 0 && (
        <div className="bg-base-200 rounded-2xl p-4">
          <p className="font-bold text-sm mb-3">Your improvement 📈</p>
          <div className="flex flex-col gap-3">
            {data.retry_effectiveness.slice(0, 4).map((r, i) => (
              <div key={i}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-base-content/70 truncate flex-1 pr-2">{r.topic}</span>
                  {r.improvement > 0
                    ? <span className="font-bold text-success shrink-0">+{r.improvement}% better!</span>
                    : <span className="font-semibold text-base-content/50 shrink-0">{r.improvement}%</span>
                  }
                </div>
                <div className="flex items-center gap-1 text-[11px] text-base-content/50">
                  <span>{Math.round(r.first_attempt)}%</span>
                  <div className="flex-1 h-1.5 bg-base-300 rounded-full overflow-hidden mx-1">
                    <div
                      className={`h-full rounded-full transition-all duration-1000 ${r.improvement > 0 ? 'bg-success' : 'bg-base-content/30'}`}
                      style={{ width: animate ? `${Math.min(r.subsequent_avg, 100)}%` : '0%' }}
                    />
                  </div>
                  <span className={r.improvement > 0 ? 'text-success font-semibold' : ''}>{r.subsequent_avg}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Per-subject mini cards */}
      {data.subjects.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="font-bold text-sm">By Subject</p>
          {data.subjects.map((s) => (
            <div key={s.subject} className="bg-base-200 rounded-xl px-4 py-3 flex items-center gap-3">
              <span className="text-xl shrink-0">{SUBJECT_EMOJI[s.subject] ?? '📚'}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{s.subject}</p>
                <p className="text-xs text-base-content/50">
                  {s.trial_count} trial{s.trial_count !== 1 ? 's' : ''}
                  {s.topics_strong > 0 && <span className="text-success"> · {s.topics_strong} strong</span>}
                  {s.topics_weak > 0   && <span className="text-warning"> · {s.topics_weak} to work on</span>}
                </p>
              </div>
              <span className={`text-base font-black shrink-0 ${scoreColor(s.avg_score)}`}>{fmt(s.avg_score)}</span>
            </div>
          ))}
        </div>
      )}

      {/* Recent trials */}
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

      {!hasActivity && (
        <div className="bg-base-200 rounded-2xl p-8 flex flex-col items-center gap-3 text-center">
          <div className="text-4xl">🌱</div>
          <p className="font-semibold">Your journey starts here!</p>
          <p className="text-sm text-base-content/60">Complete a Quest or Trial to see your progress.</p>
          <button onClick={() => router.push('/child/quests')} className="btn btn-primary btn-sm mt-1">
            Start a Quest
          </button>
        </div>
      )}
    </div>
  )
}
