'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { BarChart2, ChevronRight, Users, BookOpen, ClipboardCheck, Compass } from 'lucide-react'
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
  type: 'quest' | 'trial' | 'lesson'
  subject: string | null
  difficulty: string | null
  due_date: string | null
  gem_reward: number | null
  red_gem_cost: number
  status: string
  created_at: string
}

const TASK_TYPE_CONFIG = {
  lesson: { label: 'Lesson', Icon: BookOpen,       badge: 'badge-primary'  },
  trial:  { label: 'Trial',  Icon: ClipboardCheck, badge: 'badge-warning'  },
  quest:  { label: 'Quest',  Icon: Compass,        badge: 'badge-success'  },
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
    <div className="flex flex-col gap-6 max-w-2xl mx-auto w-full">
      {/* ── Header ── */}
      <div>
        <h1 className="text-3xl font-bold">{cls.name}</h1>
        <p className="text-sm text-base-content/60">
          {levelLabel(cls.level)}
          {cls.members.length > 0 ? ` · ${cls.members.length} student${cls.members.length !== 1 ? 's' : ''}` : ''}
        </p>
      </div>

      {/* ── Quick actions ── */}
      <div className="flex gap-3">
        <button
          onClick={() => router.push(`/teacher/classes/${classId}/add-students`)}
          className="btn btn-sm btn-primary"
        >
          + Add Students
        </button>
        <button
          onClick={() => router.push(`/teacher/classes/${classId}/assign`)}
          className="btn btn-sm btn-outline"
        >
          + Assign Activity
        </button>
      </div>

      {/* ── Analytics link ── */}
      <Link
        href={`/teacher/analytics/${classId}`}
        className="bg-base-200 hover:bg-base-300 transition-colors rounded-2xl p-4 flex items-center gap-3"
      >
        <div className="w-10 h-10 rounded-xl bg-info/10 text-info flex items-center justify-center shrink-0">
          <BarChart2 size={18} />
        </div>
        <div className="flex-1">
          <p className="font-semibold text-sm">Class Analytics</p>
          <p className="text-xs text-base-content/50">View performance and progress</p>
        </div>
        <ChevronRight size={18} className="text-base-content/30" />
      </Link>

      {/* ── Members ── */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <p className="font-semibold text-base">Students ({cls.members.length})</p>
          <div className="flex-1 h-px bg-base-200" />
        </div>
        {cls.members.length === 0 ? (
          <div className="py-6 text-center text-sm text-base-content/50">
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
                className="flex items-center gap-3 p-3 rounded-xl bg-base-200"
              >
                <div className="w-8 h-8 rounded-full bg-base-300 flex items-center justify-center text-xs font-bold shrink-0">
                  {m.nickname.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm">{m.nickname}</p>
                  <p className="text-xs text-base-content/50">{levelLabel(m.level)}</p>
                </div>
                <button
                  onClick={() => removeMember(m.child_id)}
                  disabled={removing === m.child_id}
                  className="text-xs text-error hover:opacity-70 disabled:opacity-40 shrink-0"
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
        <div className="flex items-center gap-3">
          <p className="font-semibold text-base">Activities ({cls.tasks.length})</p>
          <div className="flex-1 h-px bg-base-200" />
        </div>
        {cls.tasks.length === 0 ? (
          <div className="py-6 text-center text-sm text-base-content/50">
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
            {cls.tasks.map((task) => {
              const conf = TASK_TYPE_CONFIG[task.type] ?? TASK_TYPE_CONFIG.trial
              const TaskIcon = conf.Icon
              return (
                <div key={task.id} className="bg-base-200 rounded-2xl overflow-hidden">
                  <Link
                    href={`/teacher/classes/${classId}/tasks/${task.id}`}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-base-300 transition-colors group"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <TaskIcon size={14} className="text-base-content/40 shrink-0" />
                        <p className="font-semibold text-sm">{task.title}</p>
                        <span className={`badge badge-sm shrink-0 ${conf.badge}`}>{conf.label}</span>
                      </div>
                      <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
                        {task.subject && <span className="text-xs text-base-content/50">{subjectLabel(task.subject)}</span>}
                        {task.difficulty && <span className="text-xs text-base-content/50 capitalize">{task.difficulty}</span>}
                        {task.due_date && <span className="text-xs text-base-content/50">Due {task.due_date}</span>}
                      </div>
                    </div>
                    <ChevronRight size={16} className="text-base-content/30 group-hover:text-base-content/60 transition-colors shrink-0" />
                  </Link>
                </div>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
