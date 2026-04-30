'use client'

import { use, useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Breadcrumb from '@/components/child/Breadcrumb'
import Link from 'next/link'
import { confettiCelebration, confettiCompletion } from '@/lib/confetti'

interface TopicBreakdown {
  topic: string
  correct: number
  total: number
  percentage: number
}

interface LeaderboardUpdate {
  points_earned: number
  total_points_today: number | null
  new_rank: number | null
  previous_rank: number | null
}

interface TrialResult {
  session_id: number
  score: number
  total: number
  percentage: number
  time_taken_seconds: number
  topic_breakdown: TopicBreakdown[]
  leaderboard_update: LeaderboardUpdate | null
  subject: string
  difficulty: string
  performance_review?: string
}

function formatTime(secs: number) {
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

interface ScoreTier {
  label: string
  emoji: string
  color: string
  ringColor: string
  bg: string
}

function getTier(pct: number): ScoreTier {
  if (pct >= 90) return {
    label: 'Outstanding!', emoji: '🏆',
    color: 'text-warning', ringColor: 'oklch(var(--wa))',
    bg: 'bg-warning/10 border-warning/30',
  }
  if (pct >= 70) return {
    label: 'Great job!', emoji: '🎉',
    color: 'text-success', ringColor: 'oklch(var(--su))',
    bg: 'bg-success/10 border-success/30',
  }
  if (pct >= 50) return {
    label: 'Good effort!', emoji: '👍',
    color: 'text-primary', ringColor: 'oklch(var(--p))',
    bg: 'bg-primary/10 border-primary/30',
  }
  return {
    label: 'Keep going!', emoji: '💪',
    color: 'text-base-content', ringColor: 'oklch(var(--bc))',
    bg: 'bg-base-200 border-base-300',
  }
}

export default function ResultsPage({
  params,
}: {
  params: Promise<{ subject: string; difficulty: string }>
}) {
  const { subject: encodedSubject, difficulty } = use(params)
  const subject = decodeURIComponent(encodedSubject)
  const router = useRouter()

  const [result, setResult] = useState<TrialResult | null>(null)
  const [animate, setAnimate] = useState(false)
  const [displayPct, setDisplayPct] = useState(0)
  const confettiFiredRef = useRef(false)

  useEffect(() => {
    const stored = sessionStorage.getItem('trial_result')
    if (!stored) { router.push('/child/trials'); return }
    try {
      setResult(JSON.parse(stored))
    } catch {
      router.push('/child/trials')
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Trigger animation after result loads
  useEffect(() => {
    if (!result) return
    const t = setTimeout(() => setAnimate(true), 80)
    return () => clearTimeout(t)
  }, [result])

  // Score count-up + confetti
  useEffect(() => {
    if (!result || !animate) return
    const target = Math.round(result.percentage ?? 0)

    // Count-up animation
    let startTime: number
    const step = (ts: number) => {
      if (!startTime) startTime = ts
      const pct = Math.min((ts - startTime) / 1000, 1)
      setDisplayPct(Math.round(pct * target))
      if (pct < 1) requestAnimationFrame(step)
    }
    const rafId = requestAnimationFrame(step)

    // Confetti based on score
    if (!confettiFiredRef.current) {
      confettiFiredRef.current = true
      if (target >= 90) {
        setTimeout(() => confettiCelebration(), 500)
      } else if (target >= 70) {
        setTimeout(() => confettiCompletion(), 500)
      }
    }

    return () => cancelAnimationFrame(rafId)
  }, [result, animate])

  if (!result) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <span className="loading loading-ring loading-lg text-primary" />
      </div>
    )
  }

  const pct = Math.round(result.percentage ?? 0)
  const tier = getTier(pct)
  const r = 40
  const circ = 2 * Math.PI * r
  const dash = animate ? (pct / 100) * circ : 0
  const lb = result.leaderboard_update

  return (
    <div className={`flex flex-col gap-4 pb-8 transition-all duration-500 ${animate ? 'opacity-100' : 'opacity-0'}`}>
      <div className="flex items-center gap-3">
        <button onClick={() => router.push('/child/home')} className="btn btn-circle btn-sm btn-ghost border border-base-300">‹</button>
        <Breadcrumb crumbs={[
          { label: 'Home', href: '/child/home' },
          { label: 'Trials', href: '/child/trials' },
          { label: subject, href: `/child/trials/${encodedSubject}` },
          { label: 'Results' },
        ]} />
      </div>

      {/* Hero tier */}
      <div className={`flex flex-col items-center gap-2 py-4 rounded-2xl border ${tier.bg}`}>
        <div className={`text-6xl ${animate ? 'animate-bounce' : ''}`}>{tier.emoji}</div>
        <p className={`text-2xl font-black ${tier.color}`}>{tier.label}</p>
        <p className="text-sm text-base-content/60 italic">{subject} — {result.difficulty} Trial</p>
      </div>

      {/* Score card */}
      <div className="card bg-base-200 rounded-2xl p-4 flex flex-row items-center gap-4">
        {/* Animated donut */}
        <div className="relative w-24 h-24 shrink-0">
          <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
            <circle cx="50" cy="50" r={r} fill="none" stroke="currentColor" strokeOpacity={0.1} strokeWidth="10" />
            <circle
              cx="50" cy="50" r={r}
              fill="none"
              stroke={tier.ringColor}
              strokeWidth="10"
              strokeDasharray={`${circ}`}
              strokeDashoffset={`${circ - dash}`}
              strokeLinecap="round"
              className="transition-all duration-1000"
              style={{ transitionDelay: '200ms' }}
            />
          </svg>
          <span className={`absolute inset-0 flex items-center justify-center text-lg font-black ${tier.color}`}>
            {displayPct}%
          </span>
        </div>

        <div className="flex flex-col gap-1.5 text-sm flex-1">
          <div className="flex justify-between gap-4">
            <span className="text-base-content/60">Correct</span>
            <span className="font-bold">{result.score}/{result.total}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-base-content/60">Time</span>
            <span className="font-bold">{formatTime(result.time_taken_seconds)}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-base-content/60">Score</span>
            <span className={`font-black ${tier.color}`}>{pct}%</span>
          </div>
        </div>
      </div>

      {/* Leaderboard */}
      {lb && (
        <div className="card bg-base-200 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="font-bold italic">Leaderboard</p>
            <Link href="/child/leaderboard" className="text-xs text-primary">Full Leaderboard ›</Link>
          </div>
          <div className="flex items-center gap-3">
            <Image src="/icons/thumbs.png" alt="Thumbs up" width={40} height={40} className="object-contain" />
            <div className="flex-1">
              <p className="font-semibold text-sm">
                {lb.new_rank ? `You're #${lb.new_rank} Today!` : 'Nice work!'}
              </p>
              <p className="text-xs text-base-content/60">
                {lb.points_earned} pts earned
                {lb.total_points_today ? ` · ${lb.total_points_today} pts today` : ''}
              </p>
            </div>
            {lb.new_rank && <span className={`text-3xl font-black ${tier.color}`}>#{lb.new_rank}</span>}
          </div>
        </div>
      )}

      {/* Topics breakdown */}
      {result.topic_breakdown && result.topic_breakdown.length > 0 && (
        <div className="card bg-base-200 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="font-bold italic">Topics Breakdown</p>
            <Link href="/my-progress" className="text-xs text-primary">My Progress ›</Link>
          </div>
          <div className="flex flex-col gap-3">
            {result.topic_breakdown.map((t) => {
              const tpct = Math.round(t.percentage ?? (t.total ? (t.correct / t.total) * 100 : 0))
              const needsWork = tpct < 60
              return (
                <div key={t.topic}>
                  <div className="flex justify-between text-xs mb-1">
                    <span>{t.topic}</span>
                    <span className={`font-semibold ${needsWork ? 'text-error' : 'text-success'}`}>
                      {t.correct}/{t.total} {needsWork ? '· Needs Work' : '· Good'}
                    </span>
                  </div>
                  <progress
                    className={`progress w-full h-2.5 ${needsWork ? 'progress-error' : 'progress-success'}`}
                    value={tpct}
                    max={100}
                  />
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* AI performance review */}
      {result.performance_review && (
        <div className="card bg-base-200 rounded-2xl p-4">
          <p className="font-bold italic mb-2">Performance Review</p>
          <p className="text-sm text-base-content/70 leading-relaxed">{result.performance_review}</p>
        </div>
      )}

      <button
        onClick={() => {
          sessionStorage.removeItem('trial_result')
          router.push('/child/home')
        }}
        className="btn btn-neutral btn-lg w-full mt-2"
      >
        Done
      </button>
    </div>
  )
}
