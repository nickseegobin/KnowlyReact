'use client'

import { use, useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

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

function scoreLabel(score: number) {
  if (score >= 90) return { label: 'Outstanding!', color: 'text-warning', emoji: '🏆' }
  if (score >= 70) return { label: 'Great job!', color: 'text-success', emoji: '🎉' }
  if (score >= 50) return { label: 'Good effort!', color: 'text-primary', emoji: '👍' }
  return { label: 'Keep trying!', color: 'text-base-content', emoji: '💪' }
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

  useEffect(() => {
    const raw = sessionStorage.getItem(`quest_result_${quest_id}`)
    if (raw) {
      try {
        setResult(JSON.parse(raw))
      } catch {}
    }
    // Trigger entrance animation
    requestAnimationFrame(() => setAnimate(true))
  }, [quest_id])

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

  const { label, color, emoji } = scoreLabel(result.score)
  const progressPct = Math.min(result.score, 100)

  return (
    <div
      className={`flex flex-col gap-6 transition-all duration-700 ${
        animate ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
      }`}
    >
      {/* Trophy / celebration */}
      <div className="flex flex-col items-center gap-2 pt-4 text-center">
        <div className="text-7xl animate-bounce">{emoji}</div>
        <h1 className={`text-3xl font-bold ${color}`}>{label}</h1>
        <p className="text-base-content/60 text-sm">
          {result.title}
        </p>
        <div className="flex gap-2 mt-1">
          <span className="badge badge-ghost badge-sm">{result.subject}</span>
          <span className="badge badge-ghost badge-sm">{result.topic}</span>
        </div>
      </div>

      {/* Score ring */}
      <div className="flex flex-col items-center gap-3">
        <div className="relative w-36 h-36">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" strokeWidth="8" className="text-base-300" />
            <circle
              cx="50"
              cy="50"
              r="42"
              fill="none"
              stroke="currentColor"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 42}`}
              strokeDashoffset={`${2 * Math.PI * 42 * (1 - progressPct / 100)}`}
              className={`${color} transition-all duration-1000`}
              style={{ transitionDelay: '300ms' }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`text-3xl font-bold ${color}`}>{result.score}%</span>
            <span className="text-xs text-base-content/40">Score</span>
          </div>
        </div>

        {/* Stats row */}
        <div className="flex gap-6">
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

      {/* Badge & gems earned */}
      {(result.badge_earned || (result.gems_awarded ?? 0) > 0) && (
        <div className="flex flex-col gap-2">
          {result.badge_earned && result.badge_name && (
            <div className="flex items-center gap-3 p-4 rounded-2xl bg-warning/10 border border-warning/20">
              <span className="text-3xl">🏅</span>
              <div>
                <p className="font-semibold text-warning">Badge Earned!</p>
                <p className="text-sm text-base-content/60">{result.badge_name}</p>
                {result.is_first_completion && (
                  <p className="text-xs text-base-content/40 mt-0.5">First completion bonus</p>
                )}
              </div>
            </div>
          )}

          {(result.gems_awarded ?? 0) > 0 && (
            <div className="flex items-center gap-3 p-4 rounded-2xl bg-primary/10 border border-primary/20">
              <span className="text-3xl">💎</span>
              <div>
                <p className="font-semibold text-primary">+{result.gems_awarded} Gems Awarded</p>
                <p className="text-sm text-base-content/60">Added to your wallet</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Sections breakdown */}
      <div className="flex flex-col gap-2">
        <p className="text-xs text-base-content/40 uppercase tracking-wide font-medium">Progress</p>
        <div className="w-full bg-base-300 rounded-full h-3">
          <div
            className="h-3 rounded-full bg-success transition-all duration-1000"
            style={{
              width: `${(result.sections_completed / Math.max(result.sections_total, 1)) * 100}%`,
              transitionDelay: '500ms',
            }}
          />
        </div>
        <p className="text-xs text-base-content/50 text-right">
          {result.sections_completed} / {result.sections_total} sections completed
        </p>
      </div>

      {/* CTA buttons */}
      <div className="flex flex-col gap-2 pb-6">
        <Link
          href={`/child/quests/${encodedSubject}/${encodedTopic}`}
          className="btn btn-primary w-full"
        >
          Back to Quests
        </Link>
        <Link
          href={`/child/quests/${encodedSubject}/${encodedTopic}/${quest_id}`}
          className="btn btn-ghost w-full"
        >
          Try Again
        </Link>
        <Link href="/child/home" className="btn btn-ghost btn-sm text-base-content/40">
          Go Home
        </Link>
      </div>
    </div>
  )
}
