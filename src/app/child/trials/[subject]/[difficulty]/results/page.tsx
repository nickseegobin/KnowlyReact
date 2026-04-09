'use client'

import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Breadcrumb from '@/components/child/Breadcrumb'
import Link from 'next/link'

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

export default function ResultsPage({
  params,
}: {
  params: Promise<{ subject: string; difficulty: string }>
}) {
  const { subject: encodedSubject, difficulty } = use(params)
  const subject = decodeURIComponent(encodedSubject)
  const router = useRouter()

  const [result, setResult] = useState<TrialResult | null>(null)

  useEffect(() => {
    const stored = sessionStorage.getItem('trial_result')
    if (!stored) { router.push('/child/trials'); return }
    try {
      setResult(JSON.parse(stored))
      sessionStorage.removeItem('trial_result')
    } catch {
      router.push('/child/trials')
    }
  }, [router])

  if (!result) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <span className="loading loading-spinner loading-lg" />
      </div>
    )
  }

  const pct = Math.round(result.percentage)
  // Circle progress — circumference of r=40 circle
  const r = 40
  const circ = 2 * Math.PI * r
  const dash = (pct / 100) * circ

  const lb = result.leaderboard_update

  return (
    <div className="flex flex-col gap-4 pb-8">
      <div className="flex items-center gap-3">
        <button onClick={() => router.push('/child/home')} className="btn btn-circle btn-sm btn-ghost border border-base-300">‹</button>
        <Breadcrumb crumbs={[
          { label: 'Home', href: '/child/home' },
          { label: 'Trials', href: '/child/trials' },
          { label: subject, href: `/child/trials/${encodedSubject}` },
          { label: 'Results' },
        ]} />
      </div>

      <div className="flex items-center justify-between">
        <div>
          <p className="font-bold text-lg italic">{subject} Results</p>
        </div>
      </div>

      {/* Score card */}
      <div className="card bg-base-200 rounded-2xl p-4 flex flex-row items-center gap-4">
        {/* Donut */}
        <div className="relative w-24 h-24 shrink-0">
          <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
            <circle cx="50" cy="50" r={r} fill="none" stroke="currentColor" strokeOpacity={0.1} strokeWidth="10" />
            <circle
              cx="50" cy="50" r={r} fill="none"
              stroke="oklch(var(--p))"
              strokeWidth="10"
              strokeDasharray={`${dash} ${circ}`}
              strokeLinecap="round"
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-lg font-bold">{pct}%</span>
        </div>

        <div className="flex flex-col gap-1 text-sm">
          <div className="flex justify-between gap-8">
            <span className="text-base-content/60">Correct Answers</span>
            <span className="font-semibold">{result.score}/{result.total}</span>
          </div>
          <div className="flex justify-between gap-8">
            <span className="text-base-content/60">Time Used</span>
            <span className="font-semibold">{formatTime(result.time_taken_seconds)}</span>
          </div>
          <div className="flex justify-between gap-8">
            <span className="text-base-content/60">Score</span>
            <span className="font-semibold">{pct}%</span>
          </div>
        </div>
      </div>

      {/* Leaderboard snippet */}
      {lb && (
        <div className="card bg-base-200 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="font-bold italic">Leaderboard</p>
            <Link href="/leaderboard" className="text-xs text-primary">Full Leaderboard ›</Link>
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
            {lb.new_rank && (
              <span className="text-3xl font-bold">#{lb.new_rank}</span>
            )}
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
              const tpct = Math.round(t.percentage)
              const needsWork = tpct < 60
              return (
                <div key={t.topic}>
                  <div className="flex justify-between text-xs mb-1">
                    <span>{t.topic}</span>
                    <span className={`font-semibold ${needsWork ? 'text-error' : 'text-success'}`}>
                      {t.correct}/{t.total} {needsWork ? 'Needs Work' : 'Good'}
                    </span>
                  </div>
                  <progress
                    className={`progress w-full h-3 ${needsWork ? 'progress-error' : 'progress-success'}`}
                    value={tpct}
                    max={100}
                  />
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Performance review (AI insight) */}
      {result.performance_review && (
        <div className="card bg-base-200 rounded-2xl p-4">
          <p className="font-bold italic mb-2">Performance Review</p>
          <p className="text-sm text-base-content/70 leading-relaxed">{result.performance_review}</p>
        </div>
      )}

      <button
        onClick={() => router.push('/child/home')}
        className="btn btn-neutral btn-lg w-full mt-2"
      >
        Done
      </button>
    </div>
  )
}
