'use client'

import { use, useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
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
  external_session_id?: string
  balance_after: number
  package: ExamPackage
}

const DIFFICULTY_COST: Record<string, number> = { easy: 1, medium: 1, hard: 1 }
const TIME_PER_Q = 90

export default function ClassTrialPage({
  params,
}: {
  params: Promise<{ class_id: string; task_id: string }>
}) {
  const { class_id, task_id } = use(params)
  const searchParams = useSearchParams()
  const router = useRouter()

  const subject = searchParams.get('subject') ?? ''
  const difficulty = searchParams.get('difficulty') ?? 'easy'
  const title = searchParams.get('title') ?? subject
  const gemReward = parseInt(searchParams.get('reward') ?? '0', 10)

  const [phase, setPhase] = useState<'confirm' | 'loading' | 'exam' | 'submitting'>('confirm')
  const [session, setSession] = useState<Session | null>(null)
  const [currentIdx, setCurrentIdx] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [selected, setSelected] = useState<string | null>(null)
  const [timeLeft, setTimeLeft] = useState(TIME_PER_Q)
  const [error, setError] = useState('')

  // Timer
  useEffect(() => {
    if (phase !== 'exam') return
    if (timeLeft <= 0) { handleNext(); return }
    const t = setInterval(() => setTimeLeft((s) => s - 1), 1000)
    return () => clearInterval(t)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, timeLeft, currentIdx])

  const questions = session?.package.questions ?? []
  const total = questions.length
  const currentQ = questions[currentIdx]

  async function startExam() {
    setPhase('loading')
    setError('')
    try {
      const res = await fetch('/api/exams/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject, difficulty, source: 'teacher_assigned', task_id: parseInt(task_id) }),
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

  const handleNext = useCallback(() => {
    if (!currentQ) return
    const ans = selected ?? ''
    setAnswers((prev) => ({ ...prev, [currentQ.question_id]: ans }))
    setSelected(null)
    setTimeLeft(TIME_PER_Q)

    if (currentIdx + 1 < total) {
      setCurrentIdx((i) => i + 1)
    } else {
      submitExam({ ...answers, [currentQ.question_id]: ans })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIdx, total, selected, currentQ, answers])

  async function submitExam(finalAnswers: Record<string, string>) {
    if (!session) return
    setPhase('submitting')

    const payload = questions.map((q) => ({
      question_id: q.question_id,
      selected_answer: finalAnswers[q.question_id] ?? '',
      correct_answer: '',
      is_correct: false,
      topic: q.meta.topic,
      subtopic: q.meta.subtopic ?? '',
      cognitive_level: q.meta.cognitive_level,
    }))

    try {
      const res = await fetch(`/api/exams/${session.session_id}/submit`, {
        method: 'POST',
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
        gem_reward: gemReward,
      }))
      router.push(`/child/classes/${class_id}/trial/${task_id}/results`)
    } catch {
      setError('Failed to submit. Please try again.')
      setPhase('exam')
    }
  }

  // ── Confirm screen ─────────────────────────────────────────────────────────
  if (phase === 'confirm') {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <Link href={`/child/classes/${class_id}`} className="btn btn-circle btn-sm btn-ghost border border-base-300">‹</Link>
          <Breadcrumb crumbs={[
            { label: 'Home', href: '/child/home' },
            { label: 'Classes', href: '/child/classes' },
            { label: 'Class', href: `/child/classes/${class_id}` },
            { label: 'Trial' },
          ]} />
        </div>

        <div className="card bg-base-200 rounded-2xl p-6 flex flex-col items-center gap-6 mt-4">
          <h2 className="text-2xl font-bold text-center">{title}</h2>
          {subject && title !== subject && <p className="text-base-content/60">{subject} · {difficulty}</p>}

          <div className="flex items-center gap-3 bg-base-100 rounded-xl px-6 py-4">
            <Image src="/icons/blue-gem.png" alt="Blue gem" width={32} height={32} />
            <div>
              <p className="text-sm text-base-content/60">Cost</p>
              <p className="text-xl font-bold">{DIFFICULTY_COST[difficulty] ?? 1} Blue Gem</p>
            </div>
          </div>

          {gemReward > 0 && (
            <div className="flex items-center gap-2 text-sm text-success font-semibold">
              <Image src="/icons/blue-gem.png" alt="reward" width={18} height={18} />
              +{gemReward} gem reward on completion
            </div>
          )}

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

  // ── Loading ────────────────────────────────────────────────────────────────
  if (phase === 'loading' || phase === 'submitting') {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <span className="loading loading-spinner loading-lg" />
      </div>
    )
  }

  // ── Exam ───────────────────────────────────────────────────────────────────
  if (!currentQ) return null

  const timePct = (timeLeft / TIME_PER_Q) * 100
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
              setTimeout(handleNext, 600)
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

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between text-sm">
          <Link href={`/child/classes/${class_id}`} className="btn btn-ghost btn-sm gap-1">‹ Back</Link>
          <div className="flex flex-col items-center">
            <span className="font-bold">{mm}:{ss}</span>
            <progress className={`progress ${timeColor} w-32 h-2`} value={timePct} max={100} />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-base-content/50">Q {currentIdx + 1}/{total}</span>
            <button onClick={handleNext} className="btn btn-ghost btn-sm">
              {currentIdx + 1 === total ? 'Finish' : 'Skip ›'}
            </button>
          </div>
        </div>
      </div>

      {currentQ.meta.topic && (
        <div className="text-xs text-base-content/50 flex gap-1 items-start">
          <span>💡</span>
          <span>{currentQ.meta.topic}{currentQ.meta.subtopic ? ` · ${currentQ.meta.subtopic}` : ''}</span>
        </div>
      )}

      <div className="border-t border-base-200 pt-3 mt-2">
        <p className="font-semibold text-sm">{title}</p>
        <Breadcrumb crumbs={[
          { label: 'Home', href: '/child/home' },
          { label: 'Classes', href: '/child/classes' },
          { label: 'Class', href: `/child/classes/${class_id}` },
          { label: 'Trial' },
        ]} />
      </div>
    </div>
  )
}
