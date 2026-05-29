'use client'

import { useEffect, useState } from 'react'
import { ClipboardCheck, Compass, BookOpen } from 'lucide-react'

type Period = 'week' | 'month' | 'all'

interface Analytics {
  trial_count:     number
  quest_count:     number
  lesson_count:    number
  weekly_trials:   number
  weekly_quests:   number
  weekly_lessons:  number
  monthly_trials:  number
  monthly_quests:  number
  monthly_lessons: number
}

const PERIODS: { value: Period; label: string }[] = [
  { value: 'week',  label: 'Week'  },
  { value: 'month', label: 'Month' },
  { value: 'all',   label: 'All'   },
]

function pick(a: Analytics | null, period: Period, key: 'trials' | 'quests' | 'lessons'): number {
  if (!a) return 0
  if (period === 'week')  return a[`weekly_${key}`]  ?? 0
  if (period === 'month') return a[`monthly_${key}`] ?? 0
  const map = { trials: a.trial_count, quests: a.quest_count, lessons: a.lesson_count }
  return map[key] ?? 0
}

export default function ChildActivityStats() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null)
  const [period,    setPeriod]    = useState<Period>('week')

  useEffect(() => {
    fetch('/api/analytics/child-self')
      .then((r) => r.ok ? r.json() : null)
      .catch(() => null)
      .then((data) => { if (data) setAnalytics(data) })
  }, [])

  const trials  = pick(analytics, period, 'trials')
  const quests  = pick(analytics, period, 'quests')
  const lessons = pick(analytics, period, 'lessons')

  return (
    <div className="flex flex-col gap-2">
      {/* Period picker */}
      <div className="flex gap-0.5 bg-base-200 rounded-lg p-0.5 w-fit">
        {PERIODS.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => setPeriod(value)}
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
              period === value
                ? 'bg-base-100 shadow-sm text-base-content'
                : 'text-base-content/50 hover:text-base-content'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Counters */}
      <div className="flex gap-2 flex-wrap">
        <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-base-200 text-sm font-medium">
          <ClipboardCheck size={13} className="text-warning" />
          {trials} {trials === 1 ? 'trial' : 'trials'}
        </span>
        <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-base-200 text-sm font-medium">
          <Compass size={13} className="text-primary" />
          {quests} {quests === 1 ? 'quest' : 'quests'}
        </span>
        <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-base-200 text-sm font-medium">
          <BookOpen size={13} className="text-info" />
          {lessons} {lessons === 1 ? 'lesson' : 'lessons'}
        </span>
      </div>
    </div>
  )
}
