'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { ChevronLeft, ChevronRight, BookOpen, ClipboardCheck, Compass } from 'lucide-react'

// ── Types ─────────────────────────────────────────────────────────────────────

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

interface HistoryResponse {
  items:       ActivityItem[]
  total:       number
  page:        number
  per_page:    number
  total_pages: number
}

// ── Constants ─────────────────────────────────────────────────────────────────

const SUBJECT_DISPLAY: Record<string, string> = {
  math: 'Mathematics', english: 'English Language Arts',
  science: 'Science', social_studies: 'Social Studies',
}

const DIFFICULTY_LABEL: Record<string, string> = {
  easy: 'Easy', medium: 'Medium', hard: 'Hard',
}

const ACTIVITY_CONFIG = {
  trial:  { label: 'Trial',  Icon: ClipboardCheck, iconBg: 'bg-warning/10 text-warning',  badge: 'badge-warning'  },
  quest:  { label: 'Quest',  Icon: Compass,        iconBg: 'bg-success/10 text-success',  badge: 'badge-success'  },
  lesson: { label: 'Lesson', Icon: BookOpen,        iconBg: 'bg-primary/10 text-primary',  badge: 'badge-primary'  },
} as const

const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
]

type FilterType = 'all' | 'trials' | 'quests' | 'lessons'

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(val: number | null): string {
  return val == null ? '—' : `${Math.round(val)}%`
}

function scoreColor(val: number | null): string {
  if (val == null) return 'text-base-content'
  if (val >= 70)   return 'text-success'
  if (val >= 50)   return 'text-warning'
  return 'text-error'
}

function formatDay(iso: string): string {
  try { return new Date(iso).toLocaleDateString('en-TT', { weekday: 'short', day: 'numeric', month: 'short' }) }
  catch { return iso }
}

function formatTime(iso: string): string {
  try { return new Date(iso).toLocaleTimeString('en-TT', { hour: '2-digit', minute: '2-digit' }) }
  catch { return '' }
}

function isoDay(iso: string): string {
  return iso.slice(0, 10)
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function FullActivityPage() {
  const now   = new Date()
  const [year,   setYear]   = useState(now.getFullYear())
  const [month,  setMonth]  = useState(now.getMonth() + 1) // 1-based
  const [filter, setFilter] = useState<FilterType>('all')
  const [items,  setItems]  = useState<ActivityItem[]>([])
  const [total,  setTotal]  = useState(0)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState('')

  const fetchActivity = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const qs = new URLSearchParams({
        per_page: '100',
        month:    String(month),
        year:     String(year),
      })
      if (filter !== 'all') qs.set('type', filter)
      const res  = await fetch(`/api/analytics/history?${qs}`)
      const json: HistoryResponse = await res.json()
      if (!res.ok) { setError('Could not load activity.'); return }
      setItems(json.items ?? [])
      setTotal(json.total ?? 0)
    } catch { setError('Something went wrong.') }
    finally { setLoading(false) }
  }, [month, year, filter])

  useEffect(() => { fetchActivity() }, [fetchActivity])

  function prevMonth() {
    if (month === 1) { setMonth(12); setYear((y) => y - 1) }
    else setMonth((m) => m - 1)
  }

  function nextMonth() {
    const isCurrentMonth = year === now.getFullYear() && month === now.getMonth() + 1
    if (isCurrentMonth) return
    if (month === 12) { setMonth(1); setYear((y) => y + 1) }
    else setMonth((m) => m + 1)
  }

  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth() + 1

  // Group by calendar day
  const byDay = items.reduce<Record<string, ActivityItem[]>>((acc, item) => {
    const day = isoDay(item.completed_at)
    if (!acc[day]) acc[day] = []
    acc[day].push(item)
    return acc
  }, {})
  const days = Object.keys(byDay).sort((a, b) => b.localeCompare(a))

  const FILTERS: { key: FilterType; label: string }[] = [
    { key: 'all',     label: 'All'     },
    { key: 'trials',  label: 'Trials'  },
    { key: 'quests',  label: 'Quests'  },
    { key: 'lessons', label: 'Lessons' },
  ]

  return (
    <div className="flex flex-col gap-4 pb-8 max-w-2xl mx-auto w-full">

      {/* Header */}
      <div className="flex items-start gap-3">
        <Link
          href="/child/my-progress"
          className="btn btn-circle btn-sm btn-ghost border border-base-300 shrink-0 mt-1"
        >
          <ChevronLeft size={16} />
        </Link>
        <div>
          <h1 className="text-3xl font-bold">My Activity</h1>
          <p className="text-sm text-base-content/60 mt-0.5">Full history of your quests, trials and lessons</p>
        </div>
      </div>

      {/* Month navigation */}
      <div className="flex items-center gap-3 bg-base-200 rounded-2xl px-4 py-3">
        <button
          onClick={prevMonth}
          className="btn btn-circle btn-sm btn-ghost"
          aria-label="Previous month"
        >
          <ChevronLeft size={16} />
        </button>
        <div className="flex-1 text-center">
          <p className="font-semibold text-sm">{MONTH_NAMES[month - 1]} {year}</p>
          {!loading && <p className="text-xs text-base-content/50">{total} activit{total !== 1 ? 'ies' : 'y'}</p>}
        </div>
        <button
          onClick={nextMonth}
          disabled={isCurrentMonth}
          className="btn btn-circle btn-sm btn-ghost disabled:opacity-30"
          aria-label="Next month"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Type filter pills */}
      <div className="flex gap-2 flex-wrap">
        {FILTERS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`btn btn-sm rounded-full ${
              filter === key ? 'btn-primary' : 'btn-ghost border border-base-300'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex justify-center py-12">
          <span className="loading loading-spinner loading-md" />
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className="bg-base-200 rounded-2xl p-6 text-center text-sm text-error">{error}</div>
      )}

      {/* Empty state */}
      {!loading && !error && items.length === 0 && (
        <div className="bg-base-200 rounded-2xl p-10 flex flex-col items-center gap-3 text-center">
          <div className="text-4xl">📋</div>
          <p className="font-semibold">No activity this month</p>
          <p className="text-sm text-base-content/50">
            {filter !== 'all'
              ? `No ${filter} found for ${MONTH_NAMES[month - 1]}.`
              : `Complete a Quest, Trial or Lesson to see it here.`}
          </p>
        </div>
      )}

      {/* Activity grouped by day */}
      {!loading && !error && days.map((day) => (
        <section key={day} className="flex flex-col gap-2">
          <p className="text-xs font-bold text-base-content/40 uppercase tracking-wider px-1">
            {formatDay(`${day}T12:00:00`)}
          </p>
          <div className="flex flex-col gap-2">
            {byDay[day].map((item, i) => {
              const cfg     = ACTIVITY_CONFIG[item.type]
              const Icon    = cfg.Icon
              const isTrial = item.type === 'trial'
              const name    = item.topic ?? item.module_title ?? (item.subject ? (SUBJECT_DISPLAY[item.subject] ?? item.subject) : null)
              // Quests/lessons: "Quest: Name". Trials: subject name.
              const title = isTrial
                ? (item.subject ? (SUBJECT_DISPLAY[item.subject] ?? item.subject) : cfg.label)
                : `${cfg.label}: ${name ?? cfg.label}`
              const subtitle = [
                !isTrial && item.subject ? (SUBJECT_DISPLAY[item.subject] ?? item.subject) : null,
                isTrial && item.difficulty ? (DIFFICULTY_LABEL[item.difficulty] ?? item.difficulty) : null,
                formatTime(item.completed_at),
              ].filter(Boolean).join(' · ')

              return (
                <div key={i} className="bg-base-200 rounded-2xl px-4 py-3 flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${cfg.iconBg}`}>
                    <Icon size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{title}</p>
                    {subtitle && <p className="text-xs text-base-content/50 mt-0.5 truncate">{subtitle}</p>}
                  </div>
                  {isTrial && item.percentage != null ? (
                    <p className={`text-sm font-bold shrink-0 ml-2 ${scoreColor(item.percentage)}`}>
                      {fmt(item.percentage)}
                    </p>
                  ) : !isTrial ? (
                    <span className="badge badge-ghost badge-sm shrink-0 ml-2">Completed</span>
                  ) : null}
                </div>
              )
            })}
          </div>
        </section>
      ))}
    </div>
  )
}
