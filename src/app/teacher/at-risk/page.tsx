'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { AlertTriangle, ChevronRight, CheckCircle2 } from 'lucide-react'

interface ClassSummary {
  id:   number
  name: string
}

interface AtRiskStudent {
  user_id:     number
  nickname?:   string
  level?:      string
  avg_score?:  number | null
  trial_count: number
  quest_count: number
  classId:     number
  className:   string
}

function score(val?: number | null) {
  if (val == null) return '—'
  return `${Math.round(val)}%`
}

function levelLabel(v?: string) {
  if (!v) return ''
  return v === 'std_4' ? 'Standard 4' : v === 'std_5' ? 'Standard 5' : v
}

export default function AtRiskDashboardPage() {
  const [students, setStudents] = useState<AtRiskStudent[]>([])
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState('')

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError('')
      try {
        const classRes = await fetch('/api/classes')
        if (!classRes.ok) throw new Error('Failed to load classes.')
        const classData = await classRes.json()
        const classes: ClassSummary[] = classData.classes ?? classData ?? []

        if (classes.length === 0) { setStudents([]); return }

        const results = await Promise.allSettled(
          classes.map((c) =>
            fetch(`/api/analytics/class/${c.id}`).then((r) => r.json()).then((d) => ({ class: c, data: d }))
          )
        )

        const atRisk: AtRiskStudent[] = []
        for (const result of results) {
          if (result.status !== 'fulfilled') continue
          const { class: cls, data } = result.value
          for (const s of data.students ?? []) {
            if (s.at_risk) {
              atRisk.push({ ...s, classId: cls.id, className: cls.name })
            }
          }
        }

        setStudents(atRisk)
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Something went wrong.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  // Group by class
  const byClass = students.reduce<Record<number, AtRiskStudent[]>>((acc, s) => {
    if (!acc[s.classId]) acc[s.classId] = []
    acc[s.classId].push(s)
    return acc
  }, {})

  return (
    <div className="flex flex-col gap-6 max-w-2xl mx-auto w-full">

      {/* ── Header ── */}
      <div>
        <div className="flex items-center gap-2">
          <AlertTriangle size={22} className="text-error" />
          <h1 className="text-3xl font-bold">At-Risk Students</h1>
        </div>
        <p className="text-sm text-base-content/60 mt-1">
          Students with low average scores or low activity across all your classes.
        </p>
      </div>

      {loading && (
        <div className="flex justify-center py-12">
          <span className="loading loading-spinner loading-md" />
        </div>
      )}

      {error && (
        <div className="bg-base-200 rounded-2xl p-6 text-center text-sm text-error">{error}</div>
      )}

      {!loading && !error && students.length === 0 && (
        <div className="bg-base-200 rounded-2xl p-10 flex flex-col items-center gap-3 text-center">
          <CheckCircle2 size={36} className="text-success" />
          <div>
            <p className="font-semibold text-base">All students are on track!</p>
            <p className="text-sm text-base-content/50 mt-1">
              No at-risk students found across your classes.
            </p>
          </div>
        </div>
      )}

      {!loading && !error && Object.entries(byClass).map(([classId, classStudents]) => {
        const className = classStudents[0].className
        return (
          <section key={classId} className="flex flex-col gap-3">
            {/* Class heading */}
            <div className="flex items-center gap-3">
              <p className="font-semibold text-base">{className}</p>
              <span className="badge badge-error badge-sm">
                {classStudents.length} at risk
              </span>
              <div className="flex-1 h-px bg-base-200" />
              <Link
                href={`/teacher/analytics/${classId}`}
                className="text-xs text-primary hover:underline"
              >
                View class →
              </Link>
            </div>

            <div className="flex flex-col gap-2">
              {classStudents.map((s) => (
                <Link
                  key={s.user_id}
                  href={`/teacher/analytics/${classId}/student/${s.user_id}`}
                  className="flex items-center gap-3 p-3 rounded-2xl bg-base-200 hover:bg-base-300 transition-colors group"
                >
                  {/* Avatar */}
                  <div className="w-9 h-9 rounded-full bg-error/15 text-error flex items-center justify-center text-xs font-bold shrink-0">
                    {(s.nickname ?? `#${s.user_id}`).charAt(0).toUpperCase()}
                  </div>

                  {/* Name + subtitle */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="font-semibold text-sm">{s.nickname ?? `Student #${s.user_id}`}</p>
                      <span className="badge badge-error badge-sm gap-0.5">
                        <AlertTriangle size={9} /> At Risk
                      </span>
                    </div>
                    <p className="text-xs text-base-content/50 mt-0.5">
                      {levelLabel(s.level)}{s.level ? ' · ' : ''}{s.trial_count} trial{s.trial_count !== 1 ? 's' : ''} · {s.quest_count} quest{s.quest_count !== 1 ? 's' : ''}
                    </p>
                  </div>

                  {/* Score + chevron */}
                  <div className="flex items-center gap-1 shrink-0">
                    <p className={`text-sm font-bold text-error`}>{score(s.avg_score)}</p>
                    <ChevronRight size={16} className="text-base-content/30 group-hover:text-base-content/60 transition-colors" />
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}
