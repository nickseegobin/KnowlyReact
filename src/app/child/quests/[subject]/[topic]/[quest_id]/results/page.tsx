'use client'

import { use, useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { confettiBadge, confettiCompletion } from '@/lib/confetti'

interface QuestResult {
  quest_id: number
  title: string
  subject: string
  topic: string
  sections_total: number
  sections_completed: number
  badge_name?: string | null
  badge_earned?: boolean
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
  if (score >= 50) return { label: 'Good effort!', emoji: '👍', color: 'text-primary',  bg: 'bg-primary/10 border-primary/30' }
  return              { label: 'Keep going!',  emoji: '💪', color: 'text-base-content', bg: 'bg-base-200 border-base-300' }
}

export default function QuestResultsPage({
  params,
}: {
  params: Promise<{ subject: string; topic: string; quest_id: string }>
}) {
  const { subject: encodedSubject, topic: encodedTopic, quest_id } = use(params)
  const subject = decodeURIComponent(encodedSubject)
  const topic = decodeURIComponent(encodedTopic)
  const router = useRouter()

  const [result, setResult] = useState<QuestResult | null>(null)
  const [animate, setAnimate] = useState(false)
  const [displayScore, setDisplayScore] = useState(0)
  const [badgeModalOpen, setBadgeModalOpen] = useState(false)
  const badgeFiredRef = useRef(false)

  useEffect(() => {
    const raw = sessionStorage.getItem(`quest_result_${quest_id}`)
    if (raw) {
      try { setResult(JSON.parse(raw)) } catch {}
    }
    requestAnimationFrame(() => {
      setTimeout(() => setAnimate(true), 50)
    })
  }, [quest_id])

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

  // Confetti + badge modal on mount
  useEffect(() => {
    if (!result || badgeFiredRef.current) return
    badgeFiredRef.current = true

    if (result.badge_earned) {
      setTimeout(() => {
        setBadgeModalOpen(true)
        confettiBadge()
      }, 700)
    } else {
      setTimeout(() => confettiCompletion(), 400)
    }
  }, [result])

  if (!result) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center">
        <div className="text-5xl">🔍</div>
        <p className="text-base-content/60 text-sm">No result found for this quest.</p>
        <Link href={`/child/quests/${encodedSubject}/${encodedTopic}`} className="btn btn-primary btn-sm">
          Back to Quests
        </Link>
      </div>
    )
  }

  const tier = getTier(result.score)
  const progressPct = Math.min(result.score, 100)
  const r = 42
  const circ = 2 * Math.PI * r

  return (
    <>
      {/* Badge modal */}
      {badgeModalOpen && result.badge_earned && result.badge_name && (
        <dialog className="modal modal-open">
          <div className="modal-box flex flex-col items-center gap-4 text-center animate-pop-in">
            <div className="text-7xl animate-bounce">🏅</div>
            <h3 className="font-black text-2xl text-warning">Badge Earned!</h3>
            <p className="font-semibold">{result.badge_name}</p>
            {result.is_first_completion && (
              <span className="badge badge-warning badge-sm">First completion!</span>
            )}
            <button
              className="btn btn-warning w-full mt-2"
              onClick={() => {
                setBadgeModalOpen(false)
                confettiCompletion()
              }}
            >
              Awesome! 🎉
            </button>
          </div>
          <form method="dialog" className="modal-backdrop">
            <button onClick={() => setBadgeModalOpen(false)}>close</button>
          </form>
        </dialog>
      )}

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
            <span className="badge badge-ghost badge-sm">{result.topic}</span>
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
          <div className="flex items-center gap-3 p-4 rounded-2xl bg-primary/10 border border-primary/20 animate-fade-in-up">
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
              <p className="font-bold text-primary">+{result.gems_awarded} Gems Earned</p>
              <p className="text-xs text-base-content/60">Added to your wallet</p>
            </div>
          </div>
        )}

        {/* Badge (non-modal fallback) */}
        {result.badge_earned && result.badge_name && !badgeModalOpen && (
          <div className="flex items-center gap-3 p-4 rounded-2xl bg-warning/10 border border-warning/20">
            <span className="text-3xl">🏅</span>
            <div>
              <p className="font-bold text-warning">Badge Earned!</p>
              <p className="text-sm text-base-content/60">{result.badge_name}</p>
            </div>
          </div>
        )}

        {/* CTAs */}
        <div className="flex flex-col gap-2 pb-6">
          <Link href={`/child/quests/${encodedSubject}/${encodedTopic}`} className="btn btn-primary w-full">
            Back to Quests
          </Link>
          <Link href={`/child/quests/${encodedSubject}/${encodedTopic}/${quest_id}`} className="btn btn-ghost w-full">
            Try Again
          </Link>
          <Link href="/child/home" className="btn btn-ghost btn-sm text-base-content/40">
            Go Home
          </Link>
        </div>
      </div>
    </>
  )
}
