'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { LEVELS, PERIODS } from '@/types/knowly'

type TaskType  = 'lesson' | 'trial'
type TrialScope = 'general' | 'single' | 'multi'

const SUBJECTS = [
  { value: 'math',           label: 'Mathematics' },
  { value: 'english',        label: 'English Language Arts' },
  { value: 'science',        label: 'Science' },
  { value: 'social_studies', label: 'Social Studies' },
]

const DIFFICULTIES = [
  { value: 'easy',   label: 'Easy' },
  { value: 'medium', label: 'Medium' },
  { value: 'hard',   label: 'Hard' },
]

interface LessonEntry {
  quest_id: string
  module_number: number
  module_title: string
  topic: string
  subject: string
  objectives: string[]
}

interface Module {
  module_number: number
  module_title: string
}

export default function AssignActivityPage() {
  const router  = useRouter()
  const params  = useParams()
  const classId = params.class_id as string

  const [taskType, setTaskType] = useState<TaskType>('lesson')

  // ── Lesson catalogue ─────────────────────────────────────────────────────────
  const [level, setLevel]     = useState('std_4')
  const [period, setPeriod]   = useState('')
  const [subject, setSubject] = useState('')
  const [lessons, setLessons]   = useState<LessonEntry[]>([])
  const [lessonsLoading, setLessonsLoading] = useState(false)
  const [selectedLesson, setSelectedLesson] = useState<LessonEntry | null>(null)

  // ── Trial fields ─────────────────────────────────────────────────────────────
  const [trialSubject,  setTrialSubject]  = useState('')
  const [trialLevel,    setTrialLevel]    = useState('std_4')
  const [trialPeriod,   setTrialPeriod]   = useState('')
  const [trialScope,    setTrialScope]    = useState<TrialScope>('general')
  const [modules,       setModules]       = useState<Module[]>([])
  const [modulesLoading, setModulesLoading] = useState(false)
  const [selectedModules, setSelectedModules] = useState<number[]>([])

  // ── Shared fields ────────────────────────────────────────────────────────────
  const [title,      setTitle]      = useState('')
  const [difficulty, setDifficulty] = useState('easy')
  const [dueDate,    setDueDate]    = useState('')

  // ── Submission ───────────────────────────────────────────────────────────────
  const [submitting,   setSubmitting]   = useState(false)
  const [submitError,  setSubmitError]  = useState('')

  // ── Lesson catalogue fetch ───────────────────────────────────────────────────
  const fetchCatalogue = useCallback(async () => {
    if (taskType !== 'lesson') return
    setLessonsLoading(true)
    setSelectedLesson(null)
    try {
      const qs = new URLSearchParams({ level })
      if (period)  qs.set('period', period)
      if (subject) qs.set('subject', subject)
      const res = await fetch(`/api/lessons/teacher/catalogue?${qs}`)
      if (res.ok) {
        const data = await res.json()
        setLessons(data.lessons ?? [])
      }
    } catch { /* ignore */ }
    finally { setLessonsLoading(false) }
  }, [taskType, level, period, subject])

  useEffect(() => { fetchCatalogue() }, [fetchCatalogue])

  // ── Module list fetch (trial) ─────────────────────────────────────────────
  useEffect(() => {
    if (taskType !== 'trial' || !trialSubject) return
    setModulesLoading(true)
    setModules([])
    setSelectedModules([])
    const qs = new URLSearchParams({ subject: trialSubject, level: trialLevel })
    if (trialPeriod) qs.set('period', trialPeriod)
    fetch(`/api/exams/topics?${qs}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.modules?.length > 0) setModules(data.modules) })
      .catch(() => {})
      .finally(() => setModulesLoading(false))
  }, [taskType, trialSubject, trialLevel, trialPeriod])

  // ── Auto-generate title when trial selection changes ─────────────────────
  useEffect(() => {
    if (taskType !== 'trial') return
    const subLabel = SUBJECTS.find(s => s.value === trialSubject)?.label ?? trialSubject
    if (trialScope === 'general') {
      setTitle(subLabel ? `${subLabel} Trial` : '')
    } else if (trialScope === 'single' && selectedModules.length === 1) {
      const m = modules.find(m => m.module_number === selectedModules[0])
      setTitle(m ? `${m.module_title} Trial` : '')
    } else if (trialScope === 'multi' && selectedModules.length > 1) {
      setTitle(`${subLabel} — ${selectedModules.length} Topics`)
    }
  }, [taskType, trialScope, selectedModules, trialSubject, modules])

  // ── Toggle module selection ───────────────────────────────────────────────
  function toggleModule(num: number) {
    if (trialScope === 'single') {
      setSelectedModules(prev => prev[0] === num ? [] : [num])
    } else {
      setSelectedModules(prev =>
        prev.includes(num) ? prev.filter(n => n !== num) : [...prev, num]
      )
    }
  }

  function subjectLabel(s: string) {
    return SUBJECTS.find((x) => x.value === s)?.label ?? s.replace(/_/g, ' ')
  }

  // ── Submit ────────────────────────────────────────────────────────────────
  async function submit() {
    setSubmitError('')

    if (taskType === 'lesson' && !selectedLesson) {
      setSubmitError('Please select a lesson from the catalogue.')
      return
    }

    if (taskType === 'trial') {
      if (!trialSubject) { setSubmitError('Please select a subject.'); return }
      if (trialScope !== 'general' && selectedModules.length === 0) {
        setSubmitError('Please select at least one topic.')
        return
      }
    }

    const taskTitle = taskType === 'lesson'
      ? (selectedLesson!.module_title || selectedLesson!.topic)
      : title.trim()

    if (!taskTitle) { setSubmitError('Title is required.'); return }

    setSubmitting(true)
    try {
      const body: Record<string, unknown> = {
        title:    taskTitle,
        type:     taskType,
        due_date: dueDate || undefined,
      }

      if (taskType === 'lesson') {
        body.reference_id = selectedLesson!.quest_id
        body.subject      = selectedLesson!.subject
      } else {
        body.difficulty     = difficulty || undefined
        body.subject        = trialSubject
        body.scope          = trialScope === 'general' ? 'period' : 'general_topic'
        body.module_numbers = trialScope === 'general' ? [] : selectedModules
      }

      const res = await fetch(`/api/classes/${classId}/tasks`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) {
        setSubmitError(data.message ?? 'Failed to assign activity.')
      } else {
        router.push(`/teacher/classes/${classId}`)
      }
    } catch {
      setSubmitError('Something went wrong.')
    } finally {
      setSubmitting(false)
    }
  }

  // ── Derived ───────────────────────────────────────────────────────────────
  const canSubmit =
    taskType === 'lesson'
      ? !!selectedLesson
      : !!trialSubject && (trialScope === 'general' || selectedModules.length > 0)

  return (
    <div className="max-w-sm mx-auto w-full px-4 py-6 flex flex-col gap-6">

      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="text-base-content/50 hover:text-base-content">←</button>
        <div>
          <h1 className="text-2xl font-bold">Assign Activity</h1>
          <p className="text-sm text-base-content/50">Choose a lesson or create a trial</p>
        </div>
      </div>

      {/* Type toggle */}
      <div className="tabs tabs-boxed">
        <button className={`tab flex-1 ${taskType === 'lesson' ? 'tab-active' : ''}`} onClick={() => setTaskType('lesson')}>
          Lesson
        </button>
        <button className={`tab flex-1 ${taskType === 'trial' ? 'tab-active' : ''}`} onClick={() => setTaskType('trial')}>
          Trial
        </button>
      </div>

      {/* ── Lesson flow ── */}
      {taskType === 'lesson' && (
        <div className="flex flex-col gap-4">
          <div className="bg-base-200 rounded-2xl p-4 flex flex-col gap-3">
            <p className="font-semibold text-sm">Filter Catalogue</p>
            <div className="grid grid-cols-2 gap-2">
              <select value={level} onChange={(e) => setLevel(e.target.value)} className="select select-bordered select-sm w-full">
                {LEVELS.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
              </select>
              <select value={period} onChange={(e) => setPeriod(e.target.value)} className="select select-bordered select-sm w-full">
                <option value="">All Terms</option>
                {PERIODS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </div>
            <select value={subject} onChange={(e) => setSubject(e.target.value)} className="select select-bordered select-sm w-full">
              <option value="">All Subjects</option>
              {SUBJECTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>

          <div className="flex flex-col gap-2">
            {lessonsLoading ? (
              <div className="flex justify-center py-6"><span className="loading loading-spinner loading-md" /></div>
            ) : lessons.length === 0 ? (
              <div className="bg-base-200 rounded-2xl p-6 text-center text-sm text-base-content/50">No lessons found for these filters.</div>
            ) : (
              lessons.map((l) => (
                <button
                  key={l.quest_id}
                  onClick={() => setSelectedLesson(selectedLesson?.quest_id === l.quest_id ? null : l)}
                  className={`rounded-xl px-4 py-3 text-left transition-colors ${selectedLesson?.quest_id === l.quest_id ? 'bg-neutral text-neutral-content' : 'bg-base-200 hover:bg-base-300'}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold text-sm">{l.module_title}</p>
                    <span className="badge badge-sm shrink-0">{subjectLabel(l.subject)}</span>
                  </div>
                  {l.topic && <p className="text-xs opacity-60 mt-0.5">{l.topic}</p>}
                </button>
              ))
            )}
          </div>

          {selectedLesson && (
            <div className="bg-base-200 rounded-2xl p-3 text-sm">
              <p className="font-semibold text-xs text-base-content/50 uppercase tracking-wide mb-1">Selected Lesson</p>
              <p className="font-semibold">{selectedLesson.module_title}</p>
              <p className="text-xs text-base-content/50">{subjectLabel(selectedLesson.subject)} · {selectedLesson.topic}</p>
            </div>
          )}
        </div>
      )}

      {/* ── Trial flow ── */}
      {taskType === 'trial' && (
        <div className="flex flex-col gap-4">

          {/* Subject + Level + Period */}
          <div className="bg-base-200 rounded-2xl p-4 flex flex-col gap-3">
            <p className="font-semibold text-sm">Curriculum</p>
            <select
              value={trialSubject}
              onChange={(e) => setTrialSubject(e.target.value)}
              className="select select-bordered select-sm w-full"
            >
              <option value="">Select subject…</option>
              {SUBJECTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
            <div className="grid grid-cols-2 gap-2">
              <select value={trialLevel} onChange={(e) => setTrialLevel(e.target.value)} className="select select-bordered select-sm w-full">
                {LEVELS.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
              </select>
              <select value={trialPeriod} onChange={(e) => setTrialPeriod(e.target.value)} className="select select-bordered select-sm w-full">
                <option value="">All Terms</option>
                {PERIODS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </div>
          </div>

          {/* Trial flavour */}
          <div className="bg-base-200 rounded-2xl p-4 flex flex-col gap-3">
            <p className="font-semibold text-sm">Trial Type</p>
            <div className="flex gap-2 flex-wrap">
              {(['general', 'single', 'multi'] as TrialScope[]).map((s) => (
                <button
                  key={s}
                  onClick={() => { setTrialScope(s); setSelectedModules([]) }}
                  className={`btn btn-sm rounded-full ${trialScope === s ? 'btn-primary' : 'btn-ghost border border-base-300'}`}
                >
                  {s === 'general' ? 'General' : s === 'single' ? 'Single Topic' : 'Multi-Topic'}
                </button>
              ))}
            </div>
            <p className="text-xs text-base-content/50">
              {trialScope === 'general'
                ? 'Draws from the full question bank — all topics in scope.'
                : trialScope === 'single'
                ? 'Select one module below — questions are scoped to that topic.'
                : 'Select two or more modules — questions span the chosen topics.'}
            </p>

            {/* Module pills */}
            {trialScope !== 'general' && trialSubject && (
              <div className="flex flex-col gap-2">
                {modulesLoading ? (
                  <div className="flex justify-center py-2"><span className="loading loading-dots loading-sm" /></div>
                ) : modules.length === 0 ? (
                  <p className="text-xs text-base-content/40 text-center">No modules found for this selection.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {modules.map((m) => (
                      <button
                        key={m.module_number}
                        onClick={() => toggleModule(m.module_number)}
                        className={`btn btn-sm rounded-full ${selectedModules.includes(m.module_number) ? 'btn-primary' : 'btn-ghost border border-base-300'}`}
                      >
                        {m.module_title}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Selection summary */}
            {trialScope !== 'general' && selectedModules.length > 0 && (
              <p className="text-xs text-base-content/50 text-center">
                {selectedModules.length === 1
                  ? `1 topic selected`
                  : `${selectedModules.length} topics selected`}
              </p>
            )}
          </div>

          {/* Difficulty — trial only */}
          <div className="bg-base-200 rounded-2xl p-4 flex flex-col gap-3">
            <p className="font-semibold text-sm">Settings</p>
            <input
              type="text"
              placeholder="Activity title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="input input-bordered input-sm w-full"
            />
            <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)} className="select select-bordered select-sm w-full">
              <option value="">Any Difficulty</option>
              {DIFFICULTIES.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
            </select>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="input input-bordered input-sm w-full"
            />
          </div>
        </div>
      )}

      {/* Due date — lesson only (no title/difficulty needed) */}
      {taskType === 'lesson' && (
        <div className="bg-base-200 rounded-2xl p-4 flex flex-col gap-3">
          <p className="font-semibold text-sm">Settings</p>
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="input input-bordered input-sm w-full"
          />
        </div>
      )}

      {submitError && <p className="text-error text-xs">{submitError}</p>}

      <button onClick={submit} disabled={submitting || !canSubmit} className="btn btn-neutral w-full">
        {submitting ? <span className="loading loading-spinner loading-xs" /> : 'Assign Activity'}
      </button>
    </div>
  )
}
