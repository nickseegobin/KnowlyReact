'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { BookOpen, ClipboardCheck, Compass, ChevronRight } from 'lucide-react'
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
}

interface ActivityItem {
  type:          'trial' | 'quest' | 'lesson'
  session_id:    string | number
  subject:       string | null
  topic:         string | null
  module_title:  string | null
  difficulty:    string | null
  percentage:    number | null
  completed_at:  string
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

const SUBJECT_DISPLAY: Record<string, string> = {
  math: 'Mathematics', english: 'English Language Arts',
  science: 'Science', social_studies: 'Social Studies',
}

// Short pill labels for display-name subjects
const SUBJECT_SHORT_LABEL: Record<string, string> = {
  'Mathematics': 'Maths', 'English Language Arts': 'English',
  'Language Arts': 'English', 'Science': 'Science', 'Social Studies': 'Social Studies',
}

// Colour scheme per display-name subject — all classes must be complete strings (Tailwind purge)
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

const ACTIVITY_CONFIG = {
  trial:  { label: 'Trial',  Icon: ClipboardCheck, badge: 'badge-warning',  bg: 'bg-warning/10 text-warning'  },
  quest:  { label: 'Quest',  Icon: Compass,        badge: 'badge-success',  bg: 'bg-success/10 text-success'  },
  lesson: { label: 'Lesson', Icon: BookOpen,        badge: 'badge-primary',  bg: 'bg-primary/10 text-primary'  },
} as const

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

  const [data,            setData]            = useState<ChildAnalytics | null>(null)
  const [activity,        setActivity]        = useState<ActivityItem[]>([])
  const [animate,         setAnimate]         = useState(false)
  const [loading,         setLoading]         = useState(true)
  const [error,           setError]           = useState('')
  const [selectedSubject, setSelectedSubject] = useState('')

  useEffect(() => {
    Promise.allSettled([
      fetch('/api/analytics/child-self').then((r) => r.json()),
      fetch('/api/analytics/history?per_page=5').then((r) => r.json()),
    ]).then(([analyticsRes, historyRes]) => {
      if (analyticsRes.status === 'fulfilled') setData(analyticsRes.value)
      else setError('Could not load your progress.')
      if (historyRes.status === 'fulfilled') setActivity(historyRes.value.items ?? [])
      setTimeout(() => setAnimate(true), 80)
    }).finally(() => setLoading(false))
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

  // Subject filter — covers all three insight sections
  const subjectList = Array.from(new Set([
    ...data.strengths.map(t => normalizeSubject(t.subject)),
    ...data.weaknesses.map(t => normalizeSubject(t.subject)),
    ...data.retry_effectiveness.map(r => normalizeSubject(r.subject)),
  ]))
  const filteredStrengths = selectedSubject
    ? data.strengths.filter(t => normalizeSubject(t.subject) === selectedSubject)
    : data.strengths
  const filteredWeaknesses = selectedSubject
    ? data.weaknesses.filter(t => normalizeSubject(t.subject) === selectedSubject)
    : data.weaknesses
  const filteredRetry = selectedSubject
    ? data.retry_effectiveness.filter(r => normalizeSubject(r.subject) === selectedSubject)
    : data.retry_effectiveness.slice(0, 4)
  const hasInsights = data.strengths.length > 0 || data.weaknesses.length > 0 || data.retry_effectiveness.length > 0

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
          <p className="font-bold text-sm mb-3 text-success">What you&apos;re great at ✨</p>
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

      {/* Weaknesses — yellow/amber card (matches Trial/practice color) */}
      {filteredWeaknesses.length > 0 && (
        <div className="rounded-2xl p-4 border bg-warning/10 border-warning/25">
          <p className="font-bold text-sm mb-3 text-base-content">Level up these topics 🎯</p>
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

      {/* Improvement tracker — blue/info card (matches Lesson color) */}
      {filteredRetry.length > 0 && (
        <div className="rounded-2xl p-4 border bg-info/10 border-info/25">
          <p className="font-bold text-sm mb-3 text-info">Your improvement 📈</p>
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

      {/* My Activity */}
      {activity.length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <p className="font-bold text-sm">My Activity</p>
            <Link
              href="/child/my-progress/activity"
              className="flex items-center gap-1 text-xs text-primary hover:underline font-medium"
            >
              View All <ChevronRight size={12} />
            </Link>
          </div>
          {activity.map((item, i) => {
            const cfg  = ACTIVITY_CONFIG[item.type]
            const Icon = cfg.Icon
            const isTrial = item.type === 'trial'
            const name = item.topic ?? item.module_title ?? (item.subject ? (SUBJECT_DISPLAY[item.subject] ?? item.subject) : null)
            // Quests/lessons: "Quest: Name". Trials: subject name.
            const label = isTrial
              ? (item.subject ? (SUBJECT_DISPLAY[item.subject] ?? item.subject) : cfg.label)
              : `${cfg.label}: ${name ?? cfg.label}`
            const sub = [
              !isTrial && item.subject ? (SUBJECT_DISPLAY[item.subject] ?? item.subject) : null,
              isTrial && item.difficulty ? (DIFFICULTY_LABEL[item.difficulty] ?? item.difficulty) : null,
              relativeDate(item.completed_at),
            ].filter(Boolean).join(' · ')
            return (
              <div key={i} className="bg-base-200 rounded-xl px-4 py-3 flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${cfg.bg}`}>
                  <Icon size={15} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{label}</p>
                  {sub && <p className="text-xs text-base-content/50 truncate">{sub}</p>}
                </div>
                {isTrial && item.percentage != null ? (
                  <span className={`text-sm font-bold shrink-0 ${scoreColor(item.percentage)}`}>{fmt(item.percentage)}</span>
                ) : !isTrial ? (
                  <span className="badge badge-ghost badge-sm shrink-0">Completed</span>
                ) : null}
              </div>
            )
          })}
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
