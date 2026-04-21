'use client'

import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import Breadcrumb from '@/components/child/Breadcrumb'

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
  class_id?: string
  gem_reward?: number
  performance_review?: string
}

function formatTime(secs: number) {
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

export default function ClassTrialResultsPage({
  params,
}: {
  params: Promise<{ class_id: string; task_id: string }>
}) {
  const { class_id } = use(params)
  const router = useRouter()

  const [result, setResult] = useState<TrialResult | null>(null)

  useEffect(() => {
    const stored = sessionStorage.getItem('trial_result')
    if (!stored) { router.push(`/child/classes/${class_id}`); return }
    try {
      setResult(JSON.parse(stored))
      // Do not remove key here — Strict Mode fires this effect twice in dev,
      // so removing on first run means the second run finds nothing and redirects.
    } catch {
      router.push(`/child/classes/${class_id}`)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!result) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <span className="loading loading-spinner loading-lg" />
      </div>
    )
  }

  const pct = Math.round(result.percentage ?? 0)
  const r = 40
  const circ = 2 * Math.PI * r
  const dash = (pct / 100) * circ
  const lb = result.leaderboard_update

  return (
    <div className="flex flex-col gap-4 pb-8">
      <div className="flex items-center gap-3">
        <button onClick={() => router.push(`/child/classes/${class_id}`)} className="btn btn-circle btn-sm btn-ghost border border-base-300">‹</button>
        <Breadcrumb crumbs={[
          { label: 'Home', href: '/child/home' },
          { label: 'Classes', href: '/child/classes' },
          { label: 'Class', href: `/child/classes/${class_id}` },
          { label: 'Results' },
        ]} />
      </div>

      <div>
        <p className="font-bold text-lg italic">{result.subject} Results</p>
      </div>

      {/* Score card */}
      <div className="card bg-base-200 rounded-2xl p-4 flex flex-row items-center gap-4">
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
          {result.gem_reward ? (
            <div className="flex items-center gap-1 text-success font-semibold mt-1">
              <Image src="/icons/blue-gem.png" alt="reward" width={16} height={16} />
              +{result.gem_reward} gem reward
            </div>
          ) : null}
        </div>
      </div>

      {/* Leaderboard */}
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
          <p className="font-bold italic mb-3">Topics Breakdown</p>
          <div className="flex flex-col gap-3">
            {result.topic_breakdown.map((t) => {
              const tpct = Math.round(t.percentage ?? (t.total ? (t.correct / t.total) * 100 : 0))
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

      {result.performance_review && (
        <div className="card bg-base-200 rounded-2xl p-4">
          <p className="font-bold italic mb-2">Performance Review</p>
          <p className="text-sm text-base-content/70 leading-relaxed">{result.performance_review}</p>
        </div>
      )}

      <button
        onClick={() => router.push(`/child/classes/${class_id}`)}
        className="btn btn-neutral btn-lg w-full mt-2"
      >
        Back to Class
      </button>
    </div>
  )
}
