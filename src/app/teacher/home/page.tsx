'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Gem, Users, BarChart2, Bell, ChevronRight, Plus,
} from 'lucide-react'
import type { TeacherProfile, ClassEntry } from '@/types/knowly'

function timeGreeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

function levelLabel(level?: string) {
  if (!level) return ''
  return level === 'std_4' ? 'Standard 4' : level === 'std_5' ? 'Standard 5' : level
}

export default function TeacherHomePage() {
  const router = useRouter()
  const [user,    setUser]    = useState<TeacherProfile | null>(null)
  const [classes, setClasses] = useState<ClassEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.allSettled([
      fetch('/api/auth/me').then((r) => r.json()),
      fetch('/api/classes').then((r) => r.json()),
    ]).then(([userRes, classRes]) => {
      if (userRes.status === 'fulfilled') setUser(userRes.value)
      if (classRes.status === 'fulfilled') {
        const d = classRes.value
        setClasses(d.classes ?? d ?? [])
      }
    }).finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <span className="loading loading-spinner loading-lg" />
      </div>
    )
  }

  const firstName    = user?.first_name || user?.display_name.split(' ')[0] || 'Teacher'
  const schoolName   = user?.school_name ?? ''
  const redGems      = user?.red_gem_balance ?? 0
  const totalStudents = classes.reduce((acc, c) => acc + (c.member_count ?? 0), 0)

  return (
    <div className="flex flex-col gap-6 max-w-2xl mx-auto w-full">

      {/* ── Greeting ── */}
      <div>
        <h1 className="text-3xl font-bold">{timeGreeting()}, {firstName}!</h1>
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          <div className="flex items-center gap-1.5 bg-base-200 rounded-full px-3 py-1">
            <Gem size={14} className="text-error" />
            <span className="text-sm font-semibold">{redGems} gems</span>
          </div>
          {schoolName && (
            <span className="text-sm text-base-content/50">{schoolName} · Teacher</span>
          )}
        </div>
      </div>

      {/* ── Stats bar ── */}
      <div className="flex gap-0 text-center rounded-2xl bg-base-200 overflow-hidden">
        <div className="flex-1 py-4">
          <p className="text-2xl font-bold text-success">{classes.length}</p>
          <p className="text-xs text-base-content/50 mt-0.5">Active Classes</p>
        </div>
        <div className="w-px bg-base-300" />
        <div className="flex-1 py-4">
          <p className="text-2xl font-bold">{totalStudents}</p>
          <p className="text-xs text-base-content/50 mt-0.5">Total Students</p>
        </div>
        <div className="w-px bg-base-300" />
        <div className="flex-1 py-4">
          <p className="text-2xl font-bold text-error">{redGems}</p>
          <p className="text-xs text-base-content/50 mt-0.5">Red Gems</p>
        </div>
      </div>

      {/* ── Quick links ── */}
      <div className="grid grid-cols-2 gap-3">
        <Link
          href="/teacher/classes"
          className="flex flex-col gap-3 p-4 rounded-2xl bg-base-200 hover:bg-base-300 transition-colors"
        >
          <div className="w-11 h-11 rounded-xl bg-success/10 text-success flex items-center justify-center">
            <Users size={22} />
          </div>
          <div>
            <p className="font-semibold text-sm">Classes</p>
            <p className="text-xs text-base-content/50 mt-0.5">Manage students &amp; assignments</p>
          </div>
        </Link>

        <Link
          href="/teacher/classes"
          className="flex flex-col gap-3 p-4 rounded-2xl bg-base-200 hover:bg-base-300 transition-colors"
        >
          <div className="w-11 h-11 rounded-xl bg-info/10 text-info flex items-center justify-center">
            <BarChart2 size={22} />
          </div>
          <div>
            <p className="font-semibold text-sm">Analytics</p>
            <p className="text-xs text-base-content/50 mt-0.5">Track class performance</p>
          </div>
        </Link>

        <Link
          href="/teacher/notifications"
          className="flex flex-col gap-3 p-4 rounded-2xl bg-base-200 hover:bg-base-300 transition-colors"
        >
          <div className="w-11 h-11 rounded-xl bg-warning/10 text-warning flex items-center justify-center">
            <Bell size={22} />
          </div>
          <div>
            <p className="font-semibold text-sm">Notifications</p>
            <p className="text-xs text-base-content/50 mt-0.5">Alerts &amp; updates</p>
          </div>
        </Link>

        <Link
          href="/teacher/classes"
          className="flex flex-col gap-3 p-4 rounded-2xl bg-primary text-primary-content hover:opacity-90 transition-opacity"
        >
          <div className="w-11 h-11 rounded-xl bg-primary-content/10 flex items-center justify-center">
            <Plus size={22} />
          </div>
          <div>
            <p className="font-semibold text-sm">New Class</p>
            <p className="text-xs text-primary-content/70 mt-0.5">Create a new class</p>
          </div>
        </Link>
      </div>

      {/* ── Your classes ── */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <p className="font-semibold text-base">Your Classes</p>
          <div className="flex-1 h-px bg-base-200" />
          <Link href="/teacher/classes" className="text-xs text-primary hover:underline">
            View all
          </Link>
        </div>

        {classes.length === 0 ? (
          <div className="bg-base-200 rounded-2xl p-8 flex flex-col items-center gap-3 text-center">
            <Users size={32} className="text-base-content/30" />
            <div>
              <p className="font-semibold text-base-content/70">No classes yet</p>
              <p className="text-sm text-base-content/40 mt-1">Create your first class to get started</p>
            </div>
            <button
              onClick={() => router.push('/teacher/classes')}
              className="btn btn-primary btn-sm mt-1"
            >
              Create Class
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {classes.slice(0, 5).map((cls) => {
              const lvl = levelLabel(cls.level)
              const subtitle = [lvl, cls.member_count != null ? `${cls.member_count} student${cls.member_count !== 1 ? 's' : ''}` : ''].filter(Boolean).join(' · ')
              return (
                <Link
                  key={cls.id}
                  href={`/teacher/classes/${cls.id}`}
                  className="flex items-center gap-3 p-3 rounded-2xl bg-base-200 hover:bg-base-300 transition-colors group"
                >
                  <div className="w-10 h-10 rounded-xl bg-success/10 text-success flex items-center justify-center shrink-0">
                    <Users size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm">{cls.name}</p>
                    {subtitle && <p className="text-xs text-base-content/50">{subtitle}</p>}
                  </div>
                  <ChevronRight size={16} className="text-base-content/30 group-hover:text-base-content/60 transition-colors shrink-0" />
                </Link>
              )
            })}
            {classes.length > 5 && (
              <Link
                href="/teacher/classes"
                className="text-sm text-center text-base-content/50 hover:text-primary py-2 transition-colors"
              >
                View all {classes.length} classes →
              </Link>
            )}
          </div>
        )}
      </section>

    </div>
  )
}
