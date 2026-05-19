'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { BarChart2, ChevronRight, Users } from 'lucide-react'

interface ClassEntry {
  id: number
  name: string
  level?: string
  member_count?: number
}

function levelLabel(level?: string) {
  if (!level) return ''
  return level === 'std_4' ? 'Standard 4' : level === 'std_5' ? 'Standard 5' : level
}

export default function AnalyticsIndexPage() {
  const [classes, setClasses] = useState<ClassEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/classes')
      .then((r) => r.json())
      .then((d) => setClasses(d.classes ?? d ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="flex flex-col gap-6 max-w-2xl mx-auto w-full">

      {/* ── Header ── */}
      <div>
        <h1 className="text-3xl font-bold">Analytics</h1>
        <p className="text-sm text-base-content/60">Select a class to view performance</p>
      </div>

      {loading && (
        <div className="flex justify-center py-10">
          <span className="loading loading-spinner loading-md" />
        </div>
      )}

      {!loading && classes.length === 0 && (
        <div className="bg-base-200 rounded-2xl p-8 flex flex-col items-center gap-3 text-center">
          <BarChart2 size={32} className="text-base-content/30" />
          <div>
            <p className="font-semibold text-base-content/70">No classes yet</p>
            <p className="text-sm text-base-content/40 mt-1">Create a class to start tracking analytics</p>
          </div>
        </div>
      )}

      {!loading && classes.length > 0 && (
        <div className="flex flex-col gap-2">
          {classes.map((cls) => {
            const lvl = levelLabel(cls.level)
            const subtitle = [lvl, cls.member_count != null ? `${cls.member_count} student${cls.member_count !== 1 ? 's' : ''}` : ''].filter(Boolean).join(' · ')
            return (
              <Link
                key={cls.id}
                href={`/teacher/analytics/${cls.id}`}
                className="flex items-center gap-3 p-4 rounded-2xl bg-base-200 hover:bg-base-300 transition-colors group"
              >
                <div className="w-10 h-10 rounded-xl bg-info/10 text-info flex items-center justify-center shrink-0">
                  <Users size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm">{cls.name}</p>
                  {subtitle && <p className="text-xs text-base-content/50">{subtitle}</p>}
                </div>
                <div className="flex items-center gap-1 shrink-0 text-base-content/40 group-hover:text-base-content/60 transition-colors">
                  <BarChart2 size={14} />
                  <ChevronRight size={16} />
                </div>
              </Link>
            )
          })}
        </div>
      )}

    </div>
  )
}
