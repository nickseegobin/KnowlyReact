'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { LEVELS } from '@/types/knowly'

interface ClassMember {
  child_id: number
  parent_id: number
  nickname: string
  level: string
  joined_at: string
}

interface ClassTask {
  id: number
  title: string
  type: 'quest' | 'trial'
  subject: string | null
  difficulty: string | null
  due_date: string | null
  gem_reward: number | null
  red_gem_cost: number
  status: string
  created_at: string
}

interface ClassDetail {
  id: number
  name: string
  level?: string
  description?: string
  members: ClassMember[]
  tasks: ClassTask[]
}

function levelLabel(v?: string) {
  return LEVELS.find((l) => l.value === v)?.label ?? v ?? ''
}

function subjectLabel(s: string | null) {
  if (!s) return ''
  return s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

export default function ClassDetailPage() {
  const router = useRouter()
  const params = useParams()
  const classId = params.class_id as string

  const [cls, setCls] = useState<ClassDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [removing, setRemoving] = useState<number | null>(null)

  const fetchClass = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/classes/${classId}`)
      if (!res.ok) {
        const data = await res.json()
        setError(data.message ?? 'Failed to load class.')
      } else {
        const data = await res.json()
        setCls(data)
      }
    } catch {
      setError('Something went wrong.')
    } finally {
      setLoading(false)
    }
  }, [classId])

  useEffect(() => { fetchClass() }, [fetchClass])

  async function removeMember(childId: number) {
    setRemoving(childId)
    try {
      const res = await fetch(`/api/classes/${classId}/members/${childId}`, { method: 'DELETE' })
      if (res.ok) {
        setCls((prev) => prev ? { ...prev, members: prev.members.filter((m) => m.child_id !== childId) } : prev)
      }
    } catch { /* ignore */ }
    finally { setRemoving(null) }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <span className="loading loading-spinner loading-md" />
      </div>
    )
  }

  if (error || !cls) {
    return (
      <div className="max-w-sm mx-auto px-4 py-8 text-center text-sm text-error">
        {error || 'Class not found.'}
      </div>
    )
  }

  return (
    <div className="max-w-sm mx-auto w-full px-4 py-6 flex flex-col gap-6">
      {/* ── Header ── */}
      <div className="flex items-center gap-3">
        <button onClick={() => router.push('/teacher/classes')} className="text-base-content/50 hover:text-base-content">
          ←
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{cls.name}</h1>
          <p className="text-sm text-base-content/50">
            {levelLabel(cls.level)}
            {cls.members.length > 0 ? ` · ${cls.members.length} student${cls.members.length !== 1 ? 's' : ''}` : ''}
          </p>
        </div>
      </div>

      {/* ── Quick actions ── */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => router.push(`/teacher/classes/${classId}/add-students`)}
          className="btn btn-sm btn-neutral"
        >
          + Add Students
        </button>
        <button
          onClick={() => router.push(`/teacher/classes/${classId}/assign`)}
          className="btn btn-sm btn-neutral"
        >
          + Assign Activity
        </button>
      </div>

      {/* ── Analytics link ── */}
      <button
        onClick={() => router.push(`/teacher/analytics/${classId}`)}
        className="bg-base-200 hover:bg-base-300 transition-colors rounded-2xl p-4 flex items-center gap-3 text-left"
      >
        <div className="w-10 h-10 rounded-xl bg-neutral flex items-center justify-center shrink-0">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-neutral-content">
            <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
          </svg>
        </div>
        <div className="flex-1">
          <p className="font-semibold text-sm">Class Analytics</p>
          <p className="text-xs text-base-content/50">View performance and progress</p>
        </div>
        <span className="text-base-content/30">›</span>
      </button>

      {/* ── Members ── */}
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-base-content/60 uppercase tracking-wide">
          Students ({cls.members.length})
        </h2>
        {cls.members.length === 0 ? (
          <div className="bg-base-200 rounded-2xl p-6 text-center text-sm text-base-content/50">
            No students yet.{' '}
            <button
              onClick={() => router.push(`/teacher/classes/${classId}/add-students`)}
              className="underline"
            >
              Add students
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {cls.members.map((m) => (
              <div
                key={m.child_id}
                className="bg-base-200 rounded-xl px-4 py-3 flex items-center justify-between"
              >
                <div>
                  <p className="font-semibold text-sm">{m.nickname}</p>
                  <p className="text-xs text-base-content/50">{levelLabel(m.level)}</p>
                </div>
                <button
                  onClick={() => removeMember(m.child_id)}
                  disabled={removing === m.child_id}
                  className="text-xs text-error hover:opacity-70 disabled:opacity-40"
                >
                  {removing === m.child_id ? <span className="loading loading-spinner loading-xs" /> : 'Remove'}
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Tasks ── */}
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-base-content/60 uppercase tracking-wide">
          Active Activities ({cls.tasks.length})
        </h2>
        {cls.tasks.length === 0 ? (
          <div className="bg-base-200 rounded-2xl p-6 text-center text-sm text-base-content/50">
            No activities assigned.{' '}
            <button
              onClick={() => router.push(`/teacher/classes/${classId}/assign`)}
              className="underline"
            >
              Assign one
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {cls.tasks.map((task) => (
              <div key={task.id} className="bg-base-200 rounded-xl px-4 py-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold text-sm">{task.title}</p>
                  <span className={`badge badge-sm shrink-0 ${task.type === 'quest' ? 'badge-primary' : 'badge-secondary'}`}>
                    {task.type}
                  </span>
                </div>
                <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
                  {task.subject && <span className="text-xs text-base-content/50">{subjectLabel(task.subject)}</span>}
                  {task.difficulty && <span className="text-xs text-base-content/50 capitalize">{task.difficulty}</span>}
                  {task.gem_reward != null && (
                    <span className="text-xs text-base-content/50">{task.gem_reward} 💎</span>
                  )}
                  {task.due_date && (
                    <span className="text-xs text-base-content/50">Due {task.due_date}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
