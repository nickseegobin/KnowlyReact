'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { BookOpen, ClipboardCheck, Check } from 'lucide-react'
import { LEVELS, PERIODS } from '@/types/knowly'

type TaskType = 'lesson' | 'trial'

const SUBJECTS = [
  { value: 'math',           label: 'Mathematics' },
  { value: 'english',        label: 'English Language Arts' },
  { value: 'science',        label: 'Science' },
  { value: 'social_studies', label: 'Social Studies' },
]

const DIFFICULTIES = [
  { value: 'easy',   label: 'Easy'   },
  { value: 'medium', label: 'Medium' },
  { value: 'hard',   label: 'Hard'   },
]

const PERIOD_LABEL: Record<string, string> = Object.fromEntries(
  PERIODS.map((p) => [p.value, p.label])
)
const SUBJECT_LABEL: Record<string, string> = Object.fromEntries(
  SUBJECTS.map((s) => [s.value, s.label])
)

interface LessonEntry {
  quest_id:      string
  module_number: number
  module_title:  string
  topic:         string
  subject:       string
  period:        string
  objectives:    string[]
}

interface Module {
  module_number: number
  module_title:  string
}

// null = "All sections"; number[] = specific section indices selected
type SectionSel = null | number[]

export default function AssignActivityPage() {
  const router  = useRouter()
  const params  = useParams()
  const classId = params.class_id as string

  const [taskType, setTaskType] = useState<TaskType>('lesson')

  // ── Lesson catalogue ──────────────────────────────────────────────────────
  const [level,             setLevel]             = useState('std_4')
  const [filterPeriod,      setFilterPeriod]      = useState('')
  const [lessons,           setLessons]           = useState<LessonEntry[]>([])
  const [lessonsLoading,    setLessonsLoading]    = useState(false)
  const [selectedLessons,   setSelectedLessons]   = useState<LessonEntry[]>([])
  const [sectionSelections, setSectionSelections] = useState<Record<string, SectionSel>>({})

  // ── Trial fields ──────────────────────────────────────────────────────────
  const [trialSubject,    setTrialSubject]    = useState('')
  const [trialLevel,      setTrialLevel]      = useState('std_4')
  const [trialPeriod,     setTrialPeriod]     = useState('')
  const [modules,         setModules]         = useState<Module[]>([])
  const [modulesLoading,  setModulesLoading]  = useState(false)
  const [selectedModules, setSelectedModules] = useState<number[]>([])
  // empty selectedModules = "All Topics" (general trial)

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
      if (filterPeriod) qs.set('period', filterPeriod)
      const res = await fetch(`/api/lessons/teacher/catalogue?${qs}`)
      if (res.ok) {
        const data = await res.json()
        setLessons(data.lessons ?? [])
      }
    } catch {}
    finally { setLessonsLoading(false) }
  }, [taskType, level, filterPeriod])

  useEffect(() => { fetchCatalogue() }, [fetchCatalogue])

  // ── Trial module fetch ────────────────────────────────────────────────────
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

  // ── Auto-generate trial title ─────────────────────────────────────────────
  useEffect(() => {
    if (taskType !== 'trial' || !trialSubject) return
    const subLabel = SUBJECTS.find(s => s.value === trialSubject)?.label ?? ''
    if (selectedModules.length === 0) {
      setTitle(subLabel ? `${subLabel} Trial` : '')
    } else if (selectedModules.length === 1) {
      const m = modules.find(m => m.module_number === selectedModules[0])
      setTitle(m ? `${m.module_title} Trial` : `${subLabel} Trial`)
    } else {
      setTitle(`${subLabel} — ${selectedModules.length} Topics`)
    }
  }, [taskType, trialSubject, trialLevel, selectedModules, modules])

  // ── Lesson helpers ────────────────────────────────────────────────────────
  function toggleLesson(lesson: LessonEntry) {
    const isSelected = selectedLessons.some(l => l.quest_id === lesson.quest_id)
    if (isSelected) {
      setSectionSelections(s => { const n = { ...s }; delete n[lesson.quest_id]; return n })
      setSelectedLessons(prev => prev.filter(l => l.quest_id !== lesson.quest_id))
    } else {
      setSectionSelections(s => ({ ...s, [lesson.quest_id]: null }))
      setSelectedLessons(prev => [...prev, lesson])
    }
  }

  function toggleSection(questId: string, idx: number) {
    setSectionSelections(prev => {
      const current = prev[questId]
      if (current === null) return { ...prev, [questId]: [idx] }
      const next = current.includes(idx)
        ? current.filter(i => i !== idx)
        : [...current, idx]
      return { ...prev, [questId]: next.length === 0 ? null : next }
    })
  }

  function selectAllSections(questId: string) {
    setSectionSelections(prev => ({ ...prev, [questId]: null }))
  }

  // ── Trial helpers ─────────────────────────────────────────────────────────
  function toggleModule(num: number) {
    setSelectedModules(prev =>
      prev.includes(num) ? prev.filter(n => n !== num) : [...prev, num]
    )
  }

  // ── Submit ────────────────────────────────────────────────────────────────
  async function submit() {
    setSubmitError('')

    if (taskType === 'lesson' && selectedLessons.length === 0) {
      setSubmitError('Please select at least one lesson.'); return
    }
    if (taskType === 'trial') {
      if (!trialSubject) { setSubmitError('Please select a subject.'); return }
      if (!title.trim()) { setSubmitError('Title is required.'); return }
    }

    setSubmitting(true)
    try {
      if (taskType === 'lesson') {
        for (const lesson of selectedLessons) {
          const sel = sectionSelections[lesson.quest_id] ?? null
          const indices: Array<number | null> = sel === null ? [null] : sel
          for (const sectionIdx of indices) {
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
        }
      } else {
        // selectedModules empty = general trial; non-empty = topic-scoped
        const res = await fetch(`/api/classes/${classId}/tasks`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title:          title.trim(),
            type:           'trial',
            due_date:       dueDate || undefined,
            difficulty:     difficulty || undefined,
            subject:        trialSubject,
            scope:          selectedModules.length === 0 ? 'period' : 'general_topic',
            module_numbers: selectedModules,
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

  // ── Build period → subject → lessons groups ───────────────────────────────
  const usePeriodGrouping = !filterPeriod

  const periodGroups: Array<{
    period:   string
    label:    string
    subjects: Array<{ subject: string; label: string; lessons: LessonEntry[] }>
  }> = []

  for (const lesson of lessons) {
    const pKey = usePeriodGrouping ? (lesson.period || 'other') : (filterPeriod || 'selected')
    let pg = periodGroups.find(g => g.period === pKey)
    if (!pg) {
      const label = usePeriodGrouping
        ? (PERIOD_LABEL[pKey] ?? pKey)
        : (PERIOD_LABEL[filterPeriod] ?? filterPeriod)
      pg = { period: pKey, label, subjects: [] }
      periodGroups.push(pg)
    }
    let sg = pg.subjects.find(s => s.subject === lesson.subject)
    if (!sg) {
      sg = { subject: lesson.subject, label: SUBJECT_LABEL[lesson.subject] ?? lesson.subject, lessons: [] }
      pg.subjects.push(sg)
    }
    sg.lessons.push(lesson)
  }

  const totalSelected = selectedLessons.reduce((acc, l) => {
    const sel = sectionSelections[l.quest_id]
    return acc + (sel === null || sel.length === 0 ? 1 : sel.length)
  }, 0)

  const canSubmit =
    taskType === 'lesson'
      ? selectedLessons.length > 0
      : !!trialSubject

  // ── Filter row component (shared pill pattern) ────────────────────────────
  function PillRow({
    label, active, options, onSelect, activeClass = 'btn-neutral',
  }: {
    label:       string
    active:      string
    options:     { value: string; label: string }[]
    onSelect:    (v: string) => void
    activeClass?: string
  }) {
    return (
      <div className="flex items-center gap-3">
        <p className="text-sm font-semibold shrink-0">{label}</p>
        <div className="flex gap-2 flex-wrap">
          {options.map((o) => (
            <button
              key={o.value}
              onClick={() => onSelect(o.value)}
              className={`btn btn-sm rounded-full ${active === o.value ? activeClass : 'btn-ghost border border-base-300'}`}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto w-full px-4 py-6 flex flex-col gap-6">

      {/* ── Header ── */}
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="text-base-content/50 hover:text-base-content transition-colors">←</button>
        <div>
          <h1 className="text-2xl font-bold">Assign Activity</h1>
          <p className="text-sm text-base-content/50">Choose lessons or create a trial for your class</p>
        </div>
      </div>

      {/* ── Type toggle ── */}
      <div className="flex gap-2">
        <button
          onClick={() => setTaskType('lesson')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-semibold text-sm transition-colors ${
            taskType === 'lesson' ? 'bg-primary text-primary-content' : 'bg-base-200 hover:bg-base-300'
          }`}
        >
          <BookOpen size={16} /> Lessons
        </button>
        <button
          onClick={() => setTaskType('trial')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-semibold text-sm transition-colors ${
            taskType === 'trial' ? 'bg-warning text-warning-content' : 'bg-base-200 hover:bg-base-300'
          }`}
        >
          <ClipboardCheck size={16} /> Trial
        </button>
      </div>

      {/* ════════════════ LESSON FLOW ════════════════ */}
      {taskType === 'lesson' && (
        <div className="flex flex-col gap-5">

          {/* Level filter */}
          <PillRow
            label="Level"
            active={level}
            options={LEVELS.map(l => ({ value: l.value, label: l.label }))}
            onSelect={setLevel}
            activeClass="btn-primary"
          />

          {/* Term filter */}
          <PillRow
            label="Term"
            active={filterPeriod}
            options={[{ value: '', label: 'All Terms' }, ...PERIODS.map(p => ({ value: p.value, label: p.label }))]}
            onSelect={setFilterPeriod}
          />

          {/* Catalogue */}
          {lessonsLoading ? (
            <div className="flex justify-center py-10">
              <span className="loading loading-spinner loading-md" />
            </div>
          ) : periodGroups.length === 0 ? (
            <div className="bg-base-200 rounded-2xl p-8 text-center text-sm text-base-content/50">
              No lessons found for this level.
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              {periodGroups.map(({ period: pKey, label: pLabel, subjects }) => (
                <div key={pKey} className="flex flex-col gap-4">

                  {usePeriodGrouping && (
                    <div className="flex items-center gap-3">
                      <p className="text-base font-bold">{pLabel}</p>
                      <div className="flex-1 h-px bg-base-300" />
                    </div>
                  )}

                  {subjects.map(({ subject: sKey, label: sLabel, lessons: subLessons }) => (
                    <div key={sKey} className="flex flex-col gap-1.5">
                      <p className="text-xs font-bold text-base-content/40 uppercase tracking-wider px-1">
                        {sLabel}
                      </p>

                      {subLessons.map((lesson) => {
                        const isSelected   = selectedLessons.some(l => l.quest_id === lesson.quest_id)
                        const sel          = sectionSelections[lesson.quest_id] ?? null
                        const topicLabel   = lesson.topic || lesson.module_title
                        const objectives   = lesson.objectives ?? []
                        const hasSubtopics = objectives.length > 1

                        return (
                          <div key={lesson.quest_id} className={`rounded-2xl border transition-colors overflow-hidden ${
                            isSelected ? 'border-primary/30 bg-primary/5' : 'border-base-200 bg-base-100'
                          }`}>
                            <button
                              onClick={() => toggleLesson(lesson)}
                              className="flex items-center gap-3 w-full px-4 py-3 text-left hover:bg-base-200/50 transition-colors"
                            >
                              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                                isSelected ? 'bg-primary border-primary' : 'border-base-300'
                              }`}>
                                {isSelected && <Check size={11} className="text-primary-content" />}
                              </div>
                              <p className="text-sm font-medium flex-1 min-w-0">{topicLabel}</p>
                              {isSelected && sel !== null && sel.length > 0 && (
                                <span className="text-xs text-primary font-semibold shrink-0">
                                  {sel.length} section{sel.length !== 1 ? 's' : ''}
                                </span>
                              )}
                            </button>

                            {isSelected && (
                              <div className="px-4 pb-3 flex flex-col gap-1 border-t border-base-200/60 pt-2">
                                {!hasSubtopics ? (
                                  <p className="text-xs text-base-content/40 italic py-1">
                                    {objectives.length === 1 ? objectives[0] : 'No sub-topics'}
                                  </p>
                                ) : (
                                  <>
                                    <button
                                      onClick={() => selectAllSections(lesson.quest_id)}
                                      className={`flex items-center gap-2.5 px-2 py-1.5 rounded-xl text-left text-xs transition-colors ${
                                        sel === null ? 'bg-primary/10 text-primary' : 'hover:bg-base-200 text-base-content/60'
                                      }`}
                                    >
                                      <div className={`w-4 h-4 rounded border-2 shrink-0 flex items-center justify-center transition-colors ${
                                        sel === null ? 'bg-primary border-primary' : 'border-base-300'
                                      }`}>
                                        {sel === null && <Check size={9} className="text-primary-content" />}
                                      </div>
                                      <span className="font-medium">All sections</span>
                                      <span className="text-base-content/30 ml-auto">{objectives.length} sections</span>
                                    </button>

                                    {objectives.map((obj, i) => {
                                      const checked = Array.isArray(sel) && sel.includes(i)
                                      return (
                                        <button
                                          key={i}
                                          onClick={() => toggleSection(lesson.quest_id, i)}
                                          className={`flex items-center gap-2.5 px-2 py-1.5 rounded-xl text-left text-xs transition-colors ${
                                            checked ? 'bg-primary/10 text-primary' : 'hover:bg-base-200 text-base-content/60'
                                          }`}
                                        >
                                          <div className={`w-4 h-4 rounded border-2 shrink-0 flex items-center justify-center transition-colors ${
                                            checked ? 'bg-primary border-primary' : 'border-base-300'
                                          }`}>
                                            {checked && <Check size={9} className="text-primary-content" />}
                                          </div>
                                          {obj}
                                        </button>
                                      )
                                    })}
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  ))}
                </div>
              ))}
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

      {/* ════════════════ TRIAL FLOW ════════════════ */}
      {taskType === 'trial' && (
        <div className="flex flex-col gap-5">

          {/* Subject pills */}
          <PillRow
            label="Subject"
            active={trialSubject}
            options={SUBJECTS.map(s => ({ value: s.value, label: s.label }))}
            onSelect={(v) => { setTrialSubject(v); setSelectedModules([]) }}
            activeClass="btn-warning"
          />

          {/* Level pills */}
          <PillRow
            label="Level"
            active={trialLevel}
            options={LEVELS.map(l => ({ value: l.value, label: l.label }))}
            onSelect={setTrialLevel}
            activeClass="btn-primary"
          />

          {/* Term pills */}
          <PillRow
            label="Term"
            active={trialPeriod}
            options={[{ value: '', label: 'All Terms' }, ...PERIODS.map(p => ({ value: p.value, label: p.label }))]}
            onSelect={setTrialPeriod}
          />

          {/* Topic catalogue — loads once subject is selected */}
          {trialSubject && (
            <>
              {modulesLoading ? (
                <div className="flex justify-center py-8">
                  <span className="loading loading-spinner loading-md" />
                </div>
              ) : (
                <div className="flex flex-col gap-1.5">
                  <p className="text-xs font-bold text-base-content/40 uppercase tracking-wider px-1">
                    Topics
                  </p>

                  {/* All Topics row */}
                  <div className={`rounded-2xl border transition-colors overflow-hidden ${
                    selectedModules.length === 0 ? 'border-warning/30 bg-warning/5' : 'border-base-200 bg-base-100'
                  }`}>
                    <button
                      onClick={() => setSelectedModules([])}
                      className="flex items-center gap-3 w-full px-4 py-3 text-left hover:bg-base-200/50 transition-colors"
                    >
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                        selectedModules.length === 0 ? 'bg-warning border-warning' : 'border-base-300'
                      }`}>
                        {selectedModules.length === 0 && <Check size={11} className="text-warning-content" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">All Topics</p>
                        <p className="text-xs text-base-content/40 mt-0.5">Draws from the full question bank</p>
                      </div>
                    </button>
                  </div>

                  {/* Individual topic rows */}
                  {modules.length === 0 ? (
                    <p className="text-xs text-base-content/40 text-center py-4">No topics found for this selection.</p>
                  ) : (
                    modules.map((m) => {
                      const isSelected = selectedModules.includes(m.module_number)
                      return (
                        <div key={m.module_number} className={`rounded-2xl border transition-colors overflow-hidden ${
                          isSelected ? 'border-warning/30 bg-warning/5' : 'border-base-200 bg-base-100'
                        }`}>
                          <button
                            onClick={() => toggleModule(m.module_number)}
                            className="flex items-center gap-3 w-full px-4 py-3 text-left hover:bg-base-200/50 transition-colors"
                          >
                            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                              isSelected ? 'bg-warning border-warning' : 'border-base-300'
                            }`}>
                              {isSelected && <Check size={11} className="text-warning-content" />}
                            </div>
                            <p className="text-sm font-medium flex-1 min-w-0">{m.module_title}</p>
                          </button>
                        </div>
                      )
                    })
                  )}
                </div>
              )}

              {/* Settings */}
              <div className="flex flex-col gap-4 pt-1">
                <div className="h-px bg-base-200" />

                {/* Title */}
                <div className="flex flex-col gap-1.5">
                  <p className="text-sm font-semibold">Title</p>
                  <input
                    type="text"
                    placeholder="Activity title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="input input-bordered input-sm w-full"
                  />
                </div>

                {/* Difficulty pills */}
                <PillRow
                  label="Difficulty"
                  active={difficulty}
                  options={DIFFICULTIES.map(d => ({ value: d.value, label: d.label }))}
                  onSelect={setDifficulty}
                  activeClass="btn-primary"
                />

                {/* Due date */}
                <div className="flex flex-col gap-1.5">
                  <p className="text-sm font-semibold">Due Date (optional)</p>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="input input-bordered input-sm w-full"
                  />
                </div>
              </div>
            </>
          )}
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
        ) : taskType === 'lesson' && totalSelected > 0 ? (
          `Assign ${totalSelected} Task${totalSelected !== 1 ? 's' : ''}`
        ) : (
          'Assign Activity'
        )}
      </button>

    </div>
  )
}
