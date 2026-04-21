'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { LEVELS, PERIODS } from '@/types/knowly'

type TaskType = 'quest' | 'trial'

const SUBJECTS = [
  { value: 'math',           label: 'Mathematics' },
  { value: 'english',        label: 'English' },
  { value: 'science',        label: 'Science' },
  { value: 'social_studies', label: 'Social Studies' },
]

const DIFFICULTIES = [
  { value: 'easy',   label: 'Easy' },
  { value: 'medium', label: 'Medium' },
  { value: 'hard',   label: 'Hard' },
]

interface QuestEntry {
  quest_id: string
  module_number: number
  module_title: string
  topic: string
  subject: string
  objectives: string[]
}

export default function AssignActivityPage() {
  const router = useRouter()
  const params = useParams()
  const classId = params.class_id as string

  const [taskType, setTaskType] = useState<TaskType>('quest')

  // Quest catalogue state
  const [level, setLevel]     = useState('std_4')
  const [period, setPeriod]   = useState('')
  const [subject, setSubject] = useState('')
  const [quests, setQuests]   = useState<QuestEntry[]>([])
  const [questsLoading, setQuestsLoading] = useState(false)
  const [selectedQuest, setSelectedQuest] = useState<QuestEntry | null>(null)

  // Shared fields
  const [title, setTitle]         = useState('')
  const [difficulty, setDifficulty] = useState('')
  const [dueDate, setDueDate]     = useState('')
  const [gemReward, setGemReward] = useState('5')

  // Trial-only
  const [trialSubject, setTrialSubject] = useState('')

  // Submission
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  const fetchCatalogue = useCallback(async () => {
    if (taskType !== 'quest') return
    setQuestsLoading(true)
    setSelectedQuest(null)
    try {
      const qs = new URLSearchParams({ level })
      if (period)  qs.set('period', period)
      if (subject) qs.set('subject', subject)
      const res = await fetch(`/api/quests/teacher/catalogue?${qs}`)
      if (res.ok) {
        const data = await res.json()
        setQuests(Array.isArray(data) ? data : (data.quests ?? []))
      }
    } catch { /* ignore */ }
    finally { setQuestsLoading(false) }
  }, [taskType, level, period, subject])

  useEffect(() => { fetchCatalogue() }, [fetchCatalogue])

  function subjectLabel(s: string) {
    return SUBJECTS.find((x) => x.value === s)?.label ?? s.replace(/_/g, ' ')
  }

  async function submit() {
    setSubmitError('')

    if (taskType === 'quest' && !selectedQuest) {
      setSubmitError('Please select a quest from the catalogue.')
      return
    }
    const taskTitle = taskType === 'quest'
      ? (selectedQuest!.module_title || selectedQuest!.topic)
      : title.trim()

    if (!taskTitle) {
      setSubmitError('Title is required.')
      return
    }

    setSubmitting(true)
    try {
      const body: Record<string, unknown> = {
        title: taskTitle,
        type:  taskType,
        gem_reward: parseInt(gemReward) || 5,
      }
      if (taskType === 'quest') {
        body.reference_id = selectedQuest!.quest_id
        body.subject      = selectedQuest!.subject
      } else {
        if (trialSubject) body.subject = trialSubject
      }
      if (difficulty) body.difficulty = difficulty
      if (dueDate)    body.due_date   = dueDate

      const res = await fetch(`/api/classes/${classId}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
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

  return (
    <div className="max-w-sm mx-auto w-full px-4 py-6 flex flex-col gap-6">
      {/* ── Header ── */}
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="text-base-content/50 hover:text-base-content">
          ←
        </button>
        <div>
          <h1 className="text-2xl font-bold">Assign Activity</h1>
          <p className="text-sm text-base-content/50">Choose a quest or create a trial</p>
        </div>
      </div>

      {/* ── Type toggle ── */}
      <div className="tabs tabs-boxed">
        <button
          className={`tab flex-1 ${taskType === 'quest' ? 'tab-active' : ''}`}
          onClick={() => setTaskType('quest')}
        >
          Quest
        </button>
        <button
          className={`tab flex-1 ${taskType === 'trial' ? 'tab-active' : ''}`}
          onClick={() => setTaskType('trial')}
        >
          Trial
        </button>
      </div>

      {/* ── Quest flow ── */}
      {taskType === 'quest' && (
        <div className="flex flex-col gap-4">
          {/* Filters */}
          <div className="bg-base-200 rounded-2xl p-4 flex flex-col gap-3">
            <p className="font-semibold text-sm">Filter Catalogue</p>
            <div className="grid grid-cols-2 gap-2">
              <select
                value={level}
                onChange={(e) => setLevel(e.target.value)}
                className="select select-bordered select-sm w-full"
              >
                {LEVELS.map((l) => (
                  <option key={l.value} value={l.value}>{l.label}</option>
                ))}
              </select>
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                className="select select-bordered select-sm w-full"
              >
                <option value="">All Terms</option>
                {PERIODS.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>
            <select
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="select select-bordered select-sm w-full"
            >
              <option value="">All Subjects</option>
              {SUBJECTS.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>

          {/* Quest list */}
          <div className="flex flex-col gap-2">
            {questsLoading ? (
              <div className="flex justify-center py-6">
                <span className="loading loading-spinner loading-md" />
              </div>
            ) : quests.length === 0 ? (
              <div className="bg-base-200 rounded-2xl p-6 text-center text-sm text-base-content/50">
                No quests found for these filters.
              </div>
            ) : (
              quests.map((q) => (
                <button
                  key={q.quest_id}
                  onClick={() => setSelectedQuest(selectedQuest?.quest_id === q.quest_id ? null : q)}
                  className={`rounded-xl px-4 py-3 text-left transition-colors ${
                    selectedQuest?.quest_id === q.quest_id
                      ? 'bg-neutral text-neutral-content'
                      : 'bg-base-200 hover:bg-base-300'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold text-sm">{q.module_title}</p>
                    <span className="badge badge-sm shrink-0">{subjectLabel(q.subject)}</span>
                  </div>
                  {q.topic && <p className="text-xs opacity-60 mt-0.5">{q.topic}</p>}
                </button>
              ))
            )}
          </div>

          {selectedQuest && (
            <div className="bg-base-200 rounded-2xl p-3 text-sm">
              <p className="font-semibold text-xs text-base-content/50 uppercase tracking-wide mb-1">Selected Quest</p>
              <p className="font-semibold">{selectedQuest.module_title}</p>
              <p className="text-xs text-base-content/50">{subjectLabel(selectedQuest.subject)} · {selectedQuest.topic}</p>
            </div>
          )}
        </div>
      )}

      {/* ── Trial flow ── */}
      {taskType === 'trial' && (
        <div className="bg-base-200 rounded-2xl p-4 flex flex-col gap-3">
          <p className="font-semibold text-sm">Trial Details</p>
          <input
            type="text"
            placeholder="Activity title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="input input-bordered input-sm w-full"
          />
          <select
            value={trialSubject}
            onChange={(e) => setTrialSubject(e.target.value)}
            className="select select-bordered select-sm w-full"
          >
            <option value="">Subject (optional)</option>
            {SUBJECTS.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>
      )}

      {/* ── Shared settings ── */}
      <div className="bg-base-200 rounded-2xl p-4 flex flex-col gap-3">
        <p className="font-semibold text-sm">Settings</p>
        <div className="grid grid-cols-2 gap-2">
          <select
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value)}
            className="select select-bordered select-sm w-full"
          >
            <option value="">Any Difficulty</option>
            {DIFFICULTIES.map((d) => (
              <option key={d.value} value={d.value}>{d.label}</option>
            ))}
          </select>
          <div className="flex items-center gap-2">
            <label className="text-xs text-base-content/60 shrink-0">Gems</label>
            <input
              type="number"
              min={0}
              max={100}
              value={gemReward}
              onChange={(e) => setGemReward(e.target.value)}
              className="input input-bordered input-sm w-full"
            />
          </div>
        </div>
        <input
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          className="input input-bordered input-sm w-full"
          placeholder="Due date (optional)"
        />
      </div>

      {submitError && <p className="text-error text-xs">{submitError}</p>}

      <button
        onClick={submit}
        disabled={submitting}
        className="btn btn-neutral w-full"
      >
        {submitting ? <span className="loading loading-spinner loading-xs" /> : 'Assign Activity'}
      </button>
    </div>
  )
}
