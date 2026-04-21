'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { ClassEntry } from '@/types/knowly'

export default function TeacherHomePage() {
  const router = useRouter()
  const [classes, setClasses] = useState<ClassEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/classes')
      .then((r) => r.json())
      .then((data) => setClasses(data.classes ?? data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="max-w-sm mx-auto w-full px-4 py-8 flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-bold">Teacher Dashboard</h1>
        <p className="text-sm text-base-content/50 mt-1">Manage your classes and review student progress</p>
      </div>

      {/* ── Quick stats ── */}
      {!loading && (
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-base-200 rounded-2xl p-4 flex flex-col gap-1">
            <span className="text-3xl font-bold">{classes.length}</span>
            <span className="text-xs text-base-content/50">Active Classes</span>
          </div>
          <div className="bg-base-200 rounded-2xl p-4 flex flex-col gap-1">
            <span className="text-3xl font-bold">
              {classes.reduce((acc, c) => acc + (c.member_count ?? 0), 0)}
            </span>
            <span className="text-xs text-base-content/50">Total Students</span>
          </div>
        </div>
      )}

      {/* ── Navigation cards ── */}
      <div className="flex flex-col gap-4">
        <button
          onClick={() => router.push('/teacher/classes')}
          className="bg-base-200 hover:bg-base-300 transition-colors rounded-2xl p-5 flex items-center gap-4 text-left"
        >
          <div className="w-12 h-12 rounded-xl bg-neutral flex items-center justify-center shrink-0">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-neutral-content">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
          </div>
          <div>
            <p className="font-semibold">Classes</p>
            <p className="text-sm text-base-content/50">Create classes, add students, assign activities</p>
          </div>
          <span className="ml-auto text-base-content/30">›</span>
        </button>

        <button
          onClick={() => router.push('/teacher/classes')}
          className="bg-base-200 hover:bg-base-300 transition-colors rounded-2xl p-5 flex items-center gap-4 text-left"
        >
          <div className="w-12 h-12 rounded-xl bg-neutral flex items-center justify-center shrink-0">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-neutral-content">
              <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
            </svg>
          </div>
          <div>
            <p className="font-semibold">Analytics</p>
            <p className="text-sm text-base-content/50">Track class performance and student progress</p>
          </div>
          <span className="ml-auto text-base-content/30">›</span>
        </button>
      </div>

      {/* ── Recent classes ── */}
      {!loading && classes.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-base-content/60 uppercase tracking-wide">Your Classes</h2>
          {classes.slice(0, 3).map((cls) => (
            <button
              key={cls.id}
              onClick={() => router.push(`/teacher/classes/${cls.id}`)}
              className="bg-base-200 hover:bg-base-300 transition-colors rounded-xl p-4 flex items-center justify-between text-left"
            >
              <div>
                <p className="font-semibold text-sm">{cls.name}</p>
                <p className="text-xs text-base-content/50">
                  {cls.level ?? ''}{cls.member_count != null ? ` · ${cls.member_count} students` : ''}
                </p>
              </div>
              <span className="text-base-content/30 text-sm">›</span>
            </button>
          ))}
          {classes.length > 3 && (
            <button
              onClick={() => router.push('/teacher/classes')}
              className="text-sm text-base-content/50 hover:text-base-content text-center py-1"
            >
              View all {classes.length} classes →
            </button>
          )}
        </section>
      )}
    </div>
  )
}
