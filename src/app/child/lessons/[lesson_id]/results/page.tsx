'use client'

import { use, useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { confettiCompletion } from '@/lib/confetti'

interface LessonResult {
  quest_id: string
  title: string
  subject: string
  topic: string
  sections_total: number
  sections_completed: number
  gems_awarded?: number
  score: number
  is_first_completion?: boolean
}

interface ScoreTier {
  label: string
  emoji: string
  color: string
  bg: string
}

function getTier(score: number): ScoreTier {
  if (score >= 90) return { label: 'Outstanding!', emoji: '🏆', color: 'text-warning', bg: 'bg-warning/10 border-warning/30' }
  if (score >= 70) return { label: 'Great job!',   emoji: '🎉', color: 'text-success', bg: 'bg-success/10 border-success/30' }
  if (score >= 50) return { label: 'Good effort!', emoji: '👍', color: 'text-info',    bg: 'bg-info/10 border-info/30' }
  return              { label: 'Keep going!',  emoji: '💪', color: 'text-base-content', bg: 'bg-base-200 border-base-300' }
}

export default function LessonResultsPage({
  params,
}: {
  params: Promise<{ lesson_id: string }>
}) {
  const { lesson_id } = use(params)

  const [result, setResult] = useState<LessonResult | null>(null)
  const [animate, setAnimate] = useState(false)
  const [displayScore, setDisplayScore] = useState(0)
  const firedRef = useRef(false)

  useEffect(() => {
    const raw = sessionStorage.getItem(`quest_result_${lesson_id}`)
    if (raw) {
      try { setResult(JSON.parse(raw)) } catch {}
    }
    requestAnimationFrame(() => {
      setTimeout(() => setAnimate(true), 50)
    })
  }, [lesson_id])

  // Score count-up animation
  useEffect(() => {
    if (!result || !animate) return
    const target = result.score
    let startTime: number
    const step = (ts: number) => {
      if (!startTime) startTime = ts
      const pct = Math.min((ts - startTime) / 900, 1)
      setDisplayScore(Math.round(pct * target))
      if (pct < 1) requestAnimationFrame(step)
    }
    const id = requestAnimationFrame(step)
    return () => cancelAnimationFrame(id)
  }, [result, animate])

  useEffect(() => {
    if (!result || firedRef.current) return
    firedRef.current = true
    setTimeout(() => confettiCompletion(), 400)
  }, [result])

  if (!result) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center">
        <div className="text-5xl">🔍</div>
        <p className="text-base-content/60 text-sm">No result found for this lesson.</p>
        <Link href="/child/lessons" className="btn btn-info btn-sm">
          Back to Lessons
        </Link>
      </div>
    )
  }

  const tier = getTier(result.score)
  const progressPct = Math.min(result.score, 100)
  const r = 42
  const circ = 2 * Math.PI * r

  return (
    <div
      className={`flex flex-col gap-6 transition-all duration-700 ${
        animate ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
      }`}
    >
      {/* Hero */}
      <div className="flex flex-col items-center gap-2 pt-4 text-center">
        <div className={`text-7xl ${animate ? 'animate-bounce' : ''}`}>{tier.emoji}</div>
        <h1 className={`text-3xl font-black ${tier.color}`}>{tier.label}</h1>
        <p className="text-base-content/60 text-sm">{result.title}</p>
        <div className="flex gap-2 mt-1">
          <span className="badge badge-ghost badge-sm">{result.subject}</span>
          {result.topic && <span className="badge badge-ghost badge-sm">{result.topic}</span>}
        </div>
      </div>

      {/* Score ring */}
      <div className={`flex flex-col items-center gap-3 border rounded-2xl p-5 ${tier.bg}`}>
        <div className="relative w-36 h-36">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r={r} fill="none" stroke="currentColor" strokeWidth="8" className="text-base-300" />
            <circle
              cx="50" cy="50" r={r}
              fill="none"
              stroke="currentColor"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={`${circ}`}
              strokeDashoffset={`${circ * (1 - progressPct / 100)}`}
              className={`${tier.color} transition-all duration-1000`}
              style={{ transitionDelay: '300ms' }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`text-3xl font-black ${tier.color}`}>{displayScore}%</span>
            <span className="text-xs text-base-content/40">Score</span>
          </div>
        </div>

        <div className="flex gap-8">
          <div className="text-center">
            <p className="text-2xl font-bold">{result.sections_completed}</p>
            <p className="text-xs text-base-content/40">Sections done</p>
          </div>
          <div className="divider divider-horizontal m-0" />
          <div className="text-center">
            <p className="text-2xl font-bold">{result.sections_total}</p>
            <p className="text-xs text-base-content/40">Total sections</p>
          </div>
        </div>
      </div>

      {/* Gems earned */}
      {(result.gems_awarded ?? 0) > 0 && (
        <div className="flex items-center gap-3 p-4 rounded-2xl bg-info/10 border border-info/20 animate-fade-in-up">
          <div className="flex gap-1">
            {Array.from({ length: Math.min(result.gems_awarded ?? 0, 5) }).map((_, i) => (
              <span
                key={i}
                className="text-2xl animate-bounce"
                style={{ animationDelay: `${i * 120}ms` }}
              >
                💎
              </span>
            ))}
          </div>
          <div>
            <p className="font-bold text-info">+{result.gems_awarded} Gems Earned</p>
            <p className="text-xs text-base-content/60">Added to your wallet</p>
          </div>
        </div>
      )}

      {/* CTAs */}
      <div className="flex flex-col gap-2 pb-6">
        <Link href="/child/lessons" className="btn btn-info w-full text-info-content">
          Back to Lessons
        </Link>
        <Link href={`/child/lessons/${lesson_id}`} className="btn btn-ghost w-full">
          Study Again
        </Link>
        <Link href="/child/home" className="btn btn-ghost btn-sm text-base-content/40">
          Go Home
        </Link>
      </div>
    </div>
  )
}
