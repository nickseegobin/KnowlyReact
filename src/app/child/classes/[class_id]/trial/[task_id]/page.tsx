'use client'

import { use, useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Breadcrumb from '@/components/child/Breadcrumb'

interface Question {
  question_id: string
  question_text?: string
  question?: string
  options: Record<string, string>
  meta: { topic: string; subtopic?: string; cognitive_level: string }
}

interface ExamPackage {
  package_id: string
  meta: { level: string; period: string; subject: string; difficulty: string; topics_covered: string[] }
  questions: Question[]
}

interface Session {
  session_id: number | string
  package: ExamPackage
}

interface AssignedTask {
  id: number
  scope?: string | null
  module_numbers?: number[] | null
}

const TIME_PER_Q = 90

export default function ClassTrialPage({
  params,
}: {
  params: Promise<{ class_id: string; task_id: string }>
}) {
  const { class_id, task_id } = use(params)
  const searchParams = useSearchParams()
  const router = useRouter()

  const subject    = searchParams.get('subject')    ?? ''
  const difficulty = searchParams.get('difficulty') ?? 'easy'
  const title      = searchParams.get('title')      ?? subject

  // Fetch the task to get scope + module_numbers
  const [task, setTask] = useState<AssignedTask | null>(null)

  useEffect(() => {
    fetch(`/api/classes/${class_id}/my-tasks`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        const tasks: AssignedTask[] = data?.tasks ?? []
        const match = tasks.find(t => t.id === parseInt(task_id))
        if (match) setTask(match)
      })
      .catch(() => {})
  }, [class_id, task_id])

  const [phase, setPhase]       = useState<'confirm' | 'loading' | 'exam' | 'submitting'>('confirm')
  const [session, setSession]   = useState<Session | null>(null)
  const [currentIdx, setCurrentIdx] = useState(0)
  const [answers, setAnswers]   = useState<Record<string, string>>({})
  const [timings, setTimings]   = useState<Record<string, number>>({})
  const [selected, setSelected] = useState<string | null>(null)
  const [timeLeft, setTimeLeft] = useState(TIME_PER_Q)
  const [error, setError]       = useState('')

  // Timer
  useEffect(() => {
    if (phase !== 'exam') return
    if (timeLeft <= 0) { handleNext(); return }
    const t = setInterval(() => setTimeLeft((s) => s - 1), 1000)
    return () => clearInterval(t)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, timeLeft, currentIdx])

  const questions = session?.package.questions ?? []
  const total     = questions.length
  const currentQ  = questions[currentIdx]

  async function startExam() {
    setPhase('loading')
    setError('')
    try {
      const res = await fetch('/api/exams/start', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject,
          difficulty,
          source:         'teacher_assigned',
          task_id:        parseInt(task_id),
          scope:          task?.scope          ?? 'period',
          module_numbers: task?.module_numbers ?? [],
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.message ?? 'Failed to start trial'); setPhase('confirm'); return }
      setSession(data)
      setPhase('exam')
      setTimeLeft(TIME_PER_Q)
    } catch {
      setError('Something went wrong. Please try again.')
      setPhase('confirm')
    }
  }

  const handleNext = useCallback((overrideAnswer?: string) => {
    if (!currentQ) return
    const ans   = overrideAnswer !== undefined ? overrideAnswer : (selected ?? '')
    const spent = TIME_PER_Q - timeLeft
    const newAnswers = { ...answers, [currentQ.question_id]: ans }
    const newTimings = { ...timings, [currentQ.question_id]: spent }
    setAnswers(newAnswers)
    setTimings(newTimings)
    setSelected(null)
    setTimeLeft(TIME_PER_Q)

    if (currentIdx + 1 < total) {
      setCurrentIdx((i) => i + 1)
    } else {
      submitExam(newAnswers, newTimings)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIdx, total, selected, currentQ, answers, timings, timeLeft])

  async function submitExam(finalAnswers: Record<string, string>, finalTimings: Record<string, number> = {}) {
    if (!session) return
    setPhase('submitting')

    const payload = questions.map((q) => ({
      question_id:        q.question_id,
      selected_answer:    finalAnswers[q.question_id] ?? '',
      correct_answer:     '',
      is_correct:         false,
      topic:              q.meta.topic,
      subtopic:           q.meta.subtopic ?? '',
      cognitive_level:    q.meta.cognitive_level,
      time_taken_seconds: finalTimings[q.question_id] ?? 0,
    }))

    try {
      const res = await fetch(`/api/exams/${session.session_id}/submit`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers: payload }),
      })
      const data = await res.json()
      if (!res.ok) { setError('Submission failed'); setPhase('exam'); return }

      sessionStorage.setItem('trial_result', JSON.stringify({
        ...data,
        subject,
        difficulty,
        task_id,
        class_id,
      }))
      router.push(`/child/classes/${class_id}/trial/${task_id}/results`)
    } catch {
      setError('Failed to submit. Please try again.')
      setPhase('exam')
    }
  }

  // ── Confirm screen ────────────────────────────────────────────────────────
  if (phase === 'confirm') {
    const scopeLabel = task?.scope === 'general_topic' && task.module_numbers?.length
      ? task.module_numbers.length === 1
        ? 'Single Topic Trial'
        : `Multi-Topic Trial — ${task.module_numbers.length} topics`
      : 'General Trial — All Topics'

    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <Link href={`/child/classes/${class_id}`} className="btn btn-circle btn-sm btn-ghost border border-base-300">‹</Link>
          <Breadcrumb crumbs={[
            { label: 'Home',    href: '/child/home' },
            { label: 'Classes', href: '/child/classes' },
            { label: 'Class',   href: `/child/classes/${class_id}` },
            { label: 'Trial' },
          ]} />
        </div>

        <div className="card bg-base-200 rounded-2xl p-6 flex flex-col items-center gap-5 mt-2">
          <div className="text-center">
            <h2 className="text-2xl font-bold">{title}</h2>
            {subject && title !== subject && (
              <p className="text-base-content/60 text-sm capitalize">{subject} · {difficulty}</p>
            )}
          </div>

          <div className="w-full text-center">
            <p className="text-xs font-semibold text-base-content/50 uppercase tracking-wider mb-1">Trial Type</p>
            <p className="text-sm font-medium">{scopeLabel}</p>
          </div>

          <div className="divider my-0" />

          <div className="w-full bg-base-100 rounded-xl px-4 py-3 text-center">
            <p className="text-xs text-base-content/50">Teacher assigned — no gems required</p>
          </div>

          {error && <div className="alert alert-error py-2 text-sm w-full"><span>{error}</span></div>}

          <button onClick={startExam} className="btn btn-neutral btn-lg w-full">
            Start Trial
          </button>
          <Link href={`/child/classes/${class_id}`} className="btn btn-ghost w-full">
            Cancel
          </Link>
        </div>
      </div>
    )
  }

  // ── Loading ───────────────────────────────────────────────────────────────
  if (phase === 'loading' || phase === 'submitting') {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3">
        <span className="loading loading-ring loading-lg text-primary" />
        <p className="text-sm text-base-content/50 animate-pulse">
          {phase === 'submitting' ? 'Submitting your answers…' : 'Loading trial…'}
        </p>
      </div>
    )
  }

  // ── Exam ──────────────────────────────────────────────────────────────────
  if (!currentQ) return null

  const timePct  = (timeLeft / TIME_PER_Q) * 100
  const timeColor = timeLeft <= 15 ? 'progress-error' : 'progress-warning'
  const mm = String(Math.floor(timeLeft / 60)).padStart(2, '0')
  const ss = String(timeLeft % 60).padStart(2, '0')

  return (
    <div className="flex flex-col gap-4 pb-4">
      <div className="pt-2 text-base leading-relaxed">
        <p>{currentQ.question ?? currentQ.question_text ?? ''}</p>
      </div>

      <div className="card bg-base-200 rounded-2xl p-4 flex flex-col gap-3">
        {Object.entries(currentQ.options).map(([key, value]) => (
          <button
            key={key}
            onClick={() => {
              if (selected) return
              setSelected(key)
              setTimeout(() => handleNext(key), 600)
            }}
            className={`flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-colors ${
              selected === key
                ? 'border-primary bg-primary text-primary-content'
                : selected
                ? 'border-base-300 bg-base-100 opacity-50'
                : 'border-base-300 bg-base-100 hover:bg-base-200'
            }`}
          >
            <span className="font-bold w-6 shrink-0">{key}.</span>
            <span>{value}</span>
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between text-sm px-1">
        <Link href={`/child/classes/${class_id}`} className="btn btn-ghost btn-sm">‹ Back</Link>
        <div className="flex flex-col items-center gap-1">
          <span className="font-mono font-bold">{mm}:{ss}</span>
          <progress className={`progress ${timeColor} w-28 h-1.5`} value={timePct} max={100} />
        </div>
        <span className="text-base-content/40 text-xs">Q {currentIdx + 1}/{total}</span>
      </div>
    </div>
  )
}
