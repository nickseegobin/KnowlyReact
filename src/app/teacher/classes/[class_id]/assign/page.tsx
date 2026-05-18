'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { BookOpen, ClipboardCheck, ChevronDown, ChevronRight, Check } from 'lucide-react'
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
  quest_id:      string
  module_number: number
  module_title:  string
  topic:         string
  subject:       string
  objectives:    string[]
}

interface Module {
  module_number: number
  module_title:  string
}

export default function AssignActivityPage() {
  const router  = useRouter()
  const params  = useParams()
  const classId = params.class_id as string

  const [taskType, setTaskType] = useState<TaskType>('lesson')

  // ── Lesson catalogue ──────────────────────────────────────────────────────
  const [level,   setLevel]   = useState('std_4')
  const [period,  setPeriod]  = useState('')
  const [subject, setSubject] = useState('')
  const [lessons, setLessons] = useState<LessonEntry[]>([])
  const [lessonsLoading, setLessonsLoading] = useState(false)
  const [selectedLessons, setSelectedLessons] = useState<LessonEntry[]>([])
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set())
  const [sectionSelections, setSectionSelections] = useState<Record<string, number | null>>({})

  // ── Trial fields ──────────────────────────────────────────────────────────
  const [trialSubject,  setTrialSubject]  = useState('')
  const [trialLevel,    setTrialLevel]    = useState('std_4')
  const [trialPeriod,   setTrialPeriod]   = useState('')
  const [trialScope,    setTrialScope]    = useState<TrialScope>('general')
  const [modules,       setModules]       = useState<Module[]>([])
  const [modulesLoading, setModulesLoading] = useState(false)
  const [selectedModules, setSelectedModules] = useState<number[]>([])

  // ── Shared fields ─────────────────────────────────────────────────────────
  const [title,      setTitle]      = useState('')
  const [difficulty, setDifficulty] = useState('easy')
  const [dueDate,    setDueDate]    = useState('')

  // ── Submission ────────────────────────────────────────────────────────────
  const [submitting,  setSubmitting]  = useState(false)
  const [submitError, setSubmitError] = useState('')

  // ── Lesson catalogue fetch ────────────────────────────────────────────────
  const fetchCatalogue = useCallback(async () => {
    if (taskType !== 'lesson') return
    setLessonsLoading(true)
    setSelectedLessons([])
    setSectionSelections({})
    try {
      const qs = new URLSearchParams({ level })
      if (period)  qs.set('period', period)
      if (subject) qs.set('subject', subject)
      const res = await fetch(`/api/lessons/teacher/catalogue?${qs}`)
      if (res.ok) {
        const data = await res.json()
        const fetched: LessonEntry[] = data.lessons ?? []
        setLessons(fetched)
        setExpandedModules(new Set(fetched.map(l => l.module_title)))
      }
    } catch {}
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

  // ── Auto-generate title (trial) ───────────────────────────────────────────
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

  // ── Lesson selection helpers ──────────────────────────────────────────────
  function toggleLesson(lesson: LessonEntry) {
    setSelectedLessons(prev => {
      const exists = prev.some(l => l.quest_id === lesson.quest_id)
      if (exists) {
        setSectionSelections(s => { const n = { ...s }; delete n[lesson.quest_id]; return n })
        return prev.filter(l => l.quest_id !== lesson.quest_id)
      }
      return [...prev, lesson]
    })
  }

  function toggleModuleGroup(groupLessons: LessonEntry[]) {
    const allSelected = groupLessons.every(l => selectedLessons.some(s => s.quest_id === l.quest_id))
    if (allSelected) {
      setSectionSelections(s => {
        const n = { ...s }
        groupLessons.forEach(l => delete n[l.quest_id])
        return n
      })
      setSelectedLessons(prev => prev.filter(l => !groupLessons.some(g => g.quest_id === l.quest_id)))
    } else {
      setSelectedLessons(prev => {
        const toAdd = groupLessons.filter(l => !prev.some(s => s.quest_id === l.quest_id))
        return [...prev, ...toAdd]
      })
    }
  }

  function setSectionForLesson(questId: string, idx: number | null) {
    setSectionSelections(prev => ({ ...prev, [questId]: idx }))
  }

  function toggleExpanded(moduleTitle: string) {
    setExpandedModules(prev => {
      const next = new Set(prev)
      if (next.has(moduleTitle)) next.delete(moduleTitle)
      else next.add(moduleTitle)
      return next
    })
  }

  // ── Trial module toggle ───────────────────────────────────────────────────
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

    if (taskType === 'lesson' && selectedLessons.length === 0) {
      setSubmitError('Please select at least one lesson.')
      return
    }
    if (taskType === 'trial') {
      if (!trialSubject) { setSubmitError('Please select a subject.'); return }
      if (trialScope !== 'general' && selectedModules.length === 0) {
        setSubmitError('Please select at least one topic.'); return
      }
      if (!title.trim()) { setSubmitError('Title is required.'); return }
    }

    setSubmitting(true)
    try {
      if (taskType === 'lesson') {
        for (const lesson of selectedLessons) {
          const sectionIdx = sectionSelections[lesson.quest_id] ?? null
          const body: Record<string, unknown> = {
            title:        lesson.topic || lesson.module_title,
            type:         'lesson',
            due_date:     dueDate || undefined,
            reference_id: lesson.quest_id,
            subject:      lesson.subject,
          }
          if (sectionIdx !== null) body.lesson_section_index = sectionIdx
          const res = await fetch(`/api/classes/${classId}/tasks`, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify(body),
          })
          if (!res.ok) {
            const data = await res.json()
            setSubmitError(data.message ?? 'Failed to assign activity.')
            return
          }
        }
      } else {
        const res = await fetch(`/api/classes/${classId}/tasks`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title:          title.trim(),
            type:           'trial',
            due_date:       dueDate || undefined,
            difficulty:     difficulty || undefined,
            subject:        trialSubject,
            scope:          trialScope === 'general' ? 'period' : 'general_topic',
            module_numbers: trialScope === 'general' ? [] : selectedModules,
          }),
        })
        if (!res.ok) {
          const data = await res.json()
          setSubmitError(data.message ?? 'Failed to assign activity.')
          return
        }
      }

      router.push(`/teacher/classes/${classId}`)
    } catch {
      setSubmitError('Something went wrong.')
    } finally {
      setSubmitting(false)
    }
  }

  // ── Group lessons by module ───────────────────────────────────────────────
  const moduleGroups: Array<{ title: string; lessons: LessonEntry[] }> = []
  for (const lesson of lessons) {
    const key = lesson.module_title ?? 'Other'
    const existing = moduleGroups.find(g => g.title === key)
    if (existing) existing.lessons.push(lesson)
    else moduleGroups.push({ title: key, lessons: [lesson] })
  }

  const canSubmit =
    taskType === 'lesson'
      ? selectedLessons.length > 0
      : !!trialSubject && (trialScope === 'general' || selectedModules.length > 0)

  return (
    <div className="max-w-2xl mx-auto w-full px-4 py-6 flex flex-col gap-6">

      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="text-base-content/50 hover:text-base-content transition-colors">←</button>
        <div>
          <h1 className="text-2xl font-bold">Assign Activity</h1>
          <p className="text-sm text-base-content/50">Choose lessons or create a trial for your class</p>
        </div>
      </div>

      {/* Type toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => setTaskType('lesson')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-semibold text-sm transition-colors ${
            taskType === 'lesson' ? 'bg-primary text-primary-content' : 'bg-base-200 hover:bg-base-300'
          }`}
        >
          <BookOpen size={16} />
          Lessons
        </button>
        <button
          onClick={() => setTaskType('trial')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-semibold text-sm transition-colors ${
            taskType === 'trial' ? 'bg-warning text-warning-content' : 'bg-base-200 hover:bg-base-300'
          }`}
        >
          <ClipboardCheck size={16} />
          Trial
        </button>
      </div>

      {/* ── Lesson flow ── */}
      {taskType === 'lesson' && (
        <div className="flex flex-col gap-4">

          {/* Filter */}
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

          {/* Catalogue — grouped by module */}
          {lessonsLoading ? (
            <div className="flex justify-center py-8">
              <span className="loading loading-spinner loading-md" />
            </div>
          ) : moduleGroups.length === 0 ? (
            <div className="bg-base-200 rounded-2xl p-8 text-center text-sm text-base-content/50">
              No lessons found for these filters.
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {moduleGroups.map(({ title: moduleTitle, lessons: groupLessons }) => {
                const allSelected = groupLessons.every(l => selectedLessons.some(s => s.quest_id === l.quest_id))
                const someSelected = !allSelected && groupLessons.some(l => selectedLessons.some(s => s.quest_id === l.quest_id))
                const isExpanded = expandedModules.has(moduleTitle)

                return (
                  <div key={moduleTitle} className="flex flex-col gap-1">
                    <div className="flex items-center gap-2 px-1 mb-1">
                      <button
                        onClick={() => toggleExpanded(moduleTitle)}
                        className="flex items-center gap-1.5 flex-1 text-left min-w-0"
                      >
                        {isExpanded
                          ? <ChevronDown size={13} className="text-base-content/40 shrink-0" />
                          : <ChevronRight size={13} className="text-base-content/40 shrink-0" />}
                        <p className="text-xs font-bold text-base-content/40 uppercase tracking-wider truncate">
                          {moduleTitle}
                        </p>
                      </button>
                      <button
                        onClick={() => toggleModuleGroup(groupLessons)}
                        className={`text-xs font-medium px-2.5 py-0.5 rounded-full transition-colors shrink-0 ${
                          allSelected
                            ? 'bg-primary text-primary-content'
                            : someSelected
                            ? 'bg-primary/20 text-primary'
                            : 'text-base-content/40 hover:text-primary hover:bg-primary/10'
                        }`}
                      >
                        {allSelected ? 'Deselect all' : 'Select all'}
                      </button>
                    </div>

                    {isExpanded && (
                      <div className="flex flex-col gap-1.5">
                        {groupLessons.map((lesson) => {
                          const isSelected = selectedLessons.some(l => l.quest_id === lesson.quest_id)
                          const topicLabel = lesson.topic || lesson.module_title
                          const sectionCount = lesson.objectives?.length ?? 0
                          return (
                            <button
                              key={lesson.quest_id}
                              onClick={() => toggleLesson(lesson)}
                              className={`flex items-start gap-3 px-4 py-3 rounded-2xl border text-left transition-colors ${
                                isSelected
                                  ? 'bg-primary/10 border-primary/30'
                                  : 'bg-base-100 border-base-200 hover:bg-base-200'
                              }`}
                            >
                              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                                isSelected ? 'bg-primary border-primary' : 'border-base-300'
                              }`}>
                                {isSelected && <Check size={11} className="text-primary-content" />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium">{topicLabel}</p>
                                {sectionCount > 0 && (
                                  <p className="text-xs text-base-content/40 mt-0.5">
                                    {sectionCount} section{sectionCount !== 1 ? 's' : ''}
                                  </p>
                                )}
                              </div>
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* Selection summary with per-lesson section picker */}
          {selectedLessons.length > 0 && (
            <div className="bg-primary/10 border border-primary/20 rounded-2xl p-3 flex flex-col gap-3">
              <p className="text-xs font-semibold text-primary">
                {selectedLessons.length} sub-topic{selectedLessons.length !== 1 ? 's' : ''} selected
              </p>
              <div className="flex flex-col gap-2">
                {selectedLessons.map(l => {
                  const sectionIdx = sectionSelections[l.quest_id] ?? null
                  const objectives = l.objectives ?? []
                  const topicLabel = l.topic || l.module_title
                  return (
                    <div key={l.quest_id} className="bg-base-100 rounded-xl p-3 flex flex-col gap-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-xs font-semibold truncate">{topicLabel}</p>
                          <p className="text-xs text-base-content/40 mt-0.5">
                            {objectives.length > 0
                              ? sectionIdx !== null
                                ? `Section ${sectionIdx + 1} of ${objectives.length}`
                                : `All ${objectives.length} sections`
                              : 'Full lesson'}
                          </p>
                        </div>
                        <button
                          onClick={() => toggleLesson(l)}
                          className="text-xs text-base-content/30 hover:text-error transition-colors shrink-0 mt-0.5"
                        >
                          ✕
                        </button>
                      </div>
                      {objectives.length > 1 && (
                        <div className="flex flex-col gap-1">
                          <p className="text-xs text-base-content/40 font-medium">Assign section:</p>
                          <div className="flex gap-1.5 flex-wrap">
                            <button
                              onClick={() => setSectionForLesson(l.quest_id, null)}
                              className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                                sectionIdx === null
                                  ? 'bg-primary text-primary-content border-primary'
                                  : 'border-base-300 hover:border-primary/50 text-base-content/60'
                              }`}
                            >
                              All
                            </button>
                            {objectives.map((obj: string, i: number) => (
                              <button
                                key={i}
                                onClick={() => setSectionForLesson(l.quest_id, i)}
                                title={obj}
                                className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                                  sectionIdx === i
                                    ? 'bg-primary text-primary-content border-primary'
                                    : 'border-base-300 hover:border-primary/50 text-base-content/60'
                                }`}
                              >
                                §{i + 1}
                              </button>
                            ))}
                          </div>
                          {sectionIdx !== null && objectives[sectionIdx] && (
                            <p className="text-xs text-primary/70 leading-snug mt-0.5">
                              §{sectionIdx + 1} — {objectives[sectionIdx]}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Due date */}
          <div className="bg-base-200 rounded-2xl p-4 flex flex-col gap-2">
            <p className="font-semibold text-sm">Due Date (optional)</p>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="input input-bordered input-sm w-full"
            />
          </div>
        </div>
      )}

      {/* ── Trial flow ── */}
      {taskType === 'trial' && (
        <div className="flex flex-col gap-4">

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

            {trialScope !== 'general' && selectedModules.length > 0 && (
              <p className="text-xs text-base-content/50 text-center">
                {selectedModules.length === 1 ? '1 topic selected' : `${selectedModules.length} topics selected`}
              </p>
            )}
          </div>

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

      {submitError && <p className="text-error text-xs">{submitError}</p>}

      <button
        onClick={submit}
        disabled={submitting || !canSubmit}
        className="btn btn-primary w-full text-primary-content"
      >
        {submitting ? (
          <span className="loading loading-spinner loading-xs" />
        ) : taskType === 'lesson' && selectedLessons.length > 0 ? (
          `Assign ${selectedLessons.length} Sub-Topic${selectedLessons.length !== 1 ? 's' : ''}`
        ) : (
          'Assign Activity'
        )}
      </button>

    </div>
  )
}
