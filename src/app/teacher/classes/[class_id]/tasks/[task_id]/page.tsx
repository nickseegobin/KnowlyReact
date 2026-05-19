'use client'

import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { BookOpen, ClipboardCheck, Compass, Calendar, Clock, Users, CheckCircle2, Circle, ChevronLeft, Trash2 } from 'lucide-react'

interface TaskDetail {
  id: number
  title: string
  type: 'lesson' | 'trial' | 'quest'
  subject: string | null
  difficulty: string | null
  scope: string | null
  module_numbers: number[] | null
  reference_id: string | null
  lesson_section_index: number | null
  due_date: string | null
  gem_reward: number | null
  red_gem_cost: number
  status: string
  created_at: string
}

interface Completion {
  child_id: number
  nickname: string
  level: string | null
  completed: boolean
  completed_at: string | null
}

interface Stats {
  total: number
  completed: number
}

interface TaskDetailResponse {
  task: TaskDetail
  completions: Completion[]
  stats: Stats
}

const SUBJECT_LABELS: Record<string, string> = {
  math:           'Mathematics',
  english:        'English Language Arts',
  science:        'Science',
  social_studies: 'Social Studies',
}

const TYPE_CONFIG = {
  lesson: { label: 'Lesson',  Icon: BookOpen,       color: 'bg-primary/10 text-primary',   badge: 'badge-primary'   },
  trial:  { label: 'Trial',   Icon: ClipboardCheck, color: 'bg-warning/10 text-warning',   badge: 'badge-warning'   },
  quest:  { label: 'Quest',   Icon: Compass,        color: 'bg-success/10 text-success',   badge: 'badge-success'   },
}

function formatDate(iso: string | null, opts?: Intl.DateTimeFormatOptions) {
  if (!iso) return null
  return new Date(iso).toLocaleDateString('en-TT', {
    day: 'numeric', month: 'short', year: 'numeric',
    ...opts,
  })
}

function levelLabel(v: string | null) {
  if (!v) return ''
  return v === 'std_4' ? 'Standard 4' : v === 'std_5' ? 'Standard 5' : v
}

export default function ActivityDetailPage({
  params,
}: {
  params: Promise<{ class_id: string; task_id: string }>
}) {
  const { class_id, task_id } = use(params)
  const router = useRouter()

  const [data, setData]       = useState<TaskDetailResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/classes/${class_id}/tasks/${task_id}`)
        const json = await res.json()
        if (!res.ok) setError(json.message ?? 'Failed to load activity.')
        else setData(json)
      } catch {
        setError('Something went wrong.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [class_id, task_id])

  async function handleDelete() {
    if (!confirm('Remove this activity? This cannot be undone.')) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/classes/${class_id}/tasks/${task_id}`, { method: 'DELETE' })
      if (res.ok) router.push(`/teacher/classes/${class_id}`)
      else setError('Failed to remove activity.')
    } catch {
      setError('Something went wrong.')
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <span className="loading loading-spinner loading-md" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8 text-center text-sm text-error">
        {error || 'Activity not found.'}
      </div>
    )
  }

  const { task, completions, stats } = data
  const typeConf = TYPE_CONFIG[task.type] ?? TYPE_CONFIG.trial
  const TypeIcon = typeConf.Icon
  const completionPct = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0
  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && stats.completed < stats.total

  return (
    <div className="flex flex-col gap-6 max-w-2xl mx-auto w-full">

      {/* ── Header ── */}
      <div className="flex items-start gap-3">
        <button
          onClick={() => router.push(`/teacher/classes/${class_id}`)}
          className="btn btn-circle btn-sm btn-ghost border border-base-300 shrink-0 mt-1"
        >
          <ChevronLeft size={16} />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className={`badge badge-sm ${typeConf.badge}`}>{typeConf.label}</span>
            {task.status !== 'active' && (
              <span className="badge badge-sm badge-ghost">{task.status}</span>
            )}
          </div>
          <h1 className="text-2xl font-bold leading-tight">{task.title}</h1>
        </div>
      </div>

      {/* ── Task info card ── */}
      <div className="bg-base-200 rounded-2xl p-4 flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${typeConf.color}`}>
            <TypeIcon size={18} />
          </div>
          <div>
            <p className="font-semibold text-sm">{typeConf.label}</p>
            {task.subject && (
              <p className="text-xs text-base-content/50">{SUBJECT_LABELS[task.subject] ?? task.subject}</p>
            )}
          </div>
        </div>

        <div className="h-px bg-base-300" />

        <div className="grid grid-cols-2 gap-x-6 gap-y-2">
          <div className="flex items-center gap-2 text-sm">
            <Clock size={14} className="text-base-content/40 shrink-0" />
            <div>
              <p className="text-xs text-base-content/40">Assigned</p>
              <p className="font-medium">{formatDate(task.created_at)}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-sm">
            <Calendar size={14} className={`shrink-0 ${isOverdue ? 'text-error' : 'text-base-content/40'}`} />
            <div>
              <p className="text-xs text-base-content/40">Due date</p>
              <p className={`font-medium ${isOverdue ? 'text-error' : ''}`}>
                {task.due_date ? formatDate(task.due_date) : '—'}
              </p>
            </div>
          </div>

          {task.difficulty && (
            <div className="flex items-center gap-2 text-sm">
              <div className="w-3.5 h-3.5 shrink-0" />
              <div>
                <p className="text-xs text-base-content/40">Difficulty</p>
                <p className="font-medium capitalize">{task.difficulty}</p>
              </div>
            </div>
          )}

          {task.gem_reward != null && task.gem_reward > 0 && (
            <div className="flex items-center gap-2 text-sm">
              <div className="w-3.5 h-3.5 shrink-0" />
              <div>
                <p className="text-xs text-base-content/40">Gem reward</p>
                <p className="font-medium">💎 {task.gem_reward}</p>
              </div>
            </div>
          )}
        </div>

        {/* Lesson-specific: section info */}
        {task.type === 'lesson' && task.lesson_section_index != null && (
          <div className="bg-primary/10 rounded-xl px-3 py-2 text-xs text-primary font-medium">
            Section {task.lesson_section_index + 1} only
          </div>
        )}

        {/* Trial-specific: scope */}
        {task.type === 'trial' && task.scope && (
          <div className="bg-warning/10 rounded-xl px-3 py-2 text-xs text-warning font-medium">
            {task.scope === 'period' ? 'General — all topics' : `Specific topics (${task.module_numbers?.length ?? 0} selected)`}
          </div>
        )}
      </div>

      {/* ── Completion overview ── */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Users size={15} className="text-base-content/50" />
            <p className="font-semibold text-base">Student Progress</p>
          </div>
          <div className="flex-1 h-px bg-base-200" />
          <p className="text-sm font-bold tabular-nums">
            {stats.completed}/{stats.total}
          </p>
        </div>

        {/* Progress bar */}
        <div className="flex items-center gap-3">
          <div className="flex-1 bg-base-300 rounded-full h-2.5 overflow-hidden">
            <div
              className={`h-2.5 rounded-full transition-all duration-700 ${
                completionPct === 100 ? 'bg-success' : isOverdue ? 'bg-error' : 'bg-primary'
              }`}
              style={{ width: `${completionPct}%` }}
            />
          </div>
          <span className="text-xs font-semibold tabular-nums text-base-content/50 shrink-0 w-9 text-right">
            {completionPct}%
          </span>
        </div>

        {completionPct === 100 && (
          <p className="text-xs text-success font-medium text-center">All students completed ✓</p>
        )}
        {isOverdue && completionPct < 100 && (
          <p className="text-xs text-error font-medium text-center">
            Past due — {stats.total - stats.completed} student{stats.total - stats.completed !== 1 ? 's' : ''} still pending
          </p>
        )}
      </div>

      {/* ── Student completion list ── */}
      {completions.length === 0 ? (
        <div className="bg-base-200 rounded-2xl p-6 text-center text-sm text-base-content/50">
          No students enrolled in this class yet.
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {completions.map((c) => (
            <div
              key={c.child_id}
              className={`flex items-center gap-3 p-3 rounded-2xl transition-colors ${
                c.completed ? 'bg-success/8 border border-success/20' : 'bg-base-200'
              }`}
            >
              {/* Avatar */}
              <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                c.completed ? 'bg-success/20 text-success' : 'bg-base-300 text-base-content/60'
              }`}>
                {c.nickname.charAt(0).toUpperCase()}
              </div>

              {/* Name + level */}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm">{c.nickname}</p>
                {c.level && (
                  <p className="text-xs text-base-content/40">{levelLabel(c.level)}</p>
                )}
              </div>

              {/* Status */}
              <div className="flex items-center gap-1.5 shrink-0">
                {c.completed ? (
                  <>
                    <CheckCircle2 size={16} className="text-success" />
                    <div className="text-right">
                      <p className="text-xs font-semibold text-success">Done</p>
                      {c.completed_at && (
                        <p className="text-xs text-base-content/40">{formatDate(c.completed_at)}</p>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    <Circle size={16} className="text-base-content/25" />
                    <p className="text-xs text-base-content/40">Pending</p>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Danger zone ── */}
      <div className="border border-error/20 rounded-2xl p-4 flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-error">Remove Activity</p>
          <p className="text-xs text-base-content/50 mt-0.5">This will remove the activity for all students in the class.</p>
        </div>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="btn btn-sm btn-error btn-outline shrink-0 gap-1.5"
        >
          {deleting
            ? <span className="loading loading-spinner loading-xs" />
            : <><Trash2 size={13} /> Remove</>}
        </button>
      </div>

    </div>
  )
}
