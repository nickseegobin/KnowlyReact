'use client'

import { use, useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Breadcrumb from '@/components/child/Breadcrumb'
import QuestionRenderer from '@/components/QuestionRenderer'
import { haptic, HAPTIC_SELECT } from '@/lib/haptic'
import { soundSelect } from '@/lib/sound'

interface Question {
  question_id: string
  question_text?: string
  question?: string
  tip?: string
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

interface ActiveSession {
  session_id: number
  subject: string
  difficulty: string
  started_at: string
  checkpoint?: {
    session_id: number
    state: { currentIdx: number; answers: Record<string, string>; timings: Record<string, number> }
    saved_at: string
  } | null
}

const DIFFICULTY_LABEL: Record<string, string> = { easy: 'Easy', medium: 'Medium', hard: 'Hard' }
const TIME_PER_Q = 90

export default function TrialPage({
  params,
}: {
  params: Promise<{ subject: string; difficulty: string }>
}) {
  const { subject: encodedSubject, difficulty } = use(params)
  const subject = decodeURIComponent(encodedSubject)
  const router = useRouter()

  const [phase, setPhase] = useState<'confirm' | 'loading' | 'exam' | 'submitting'>('confirm')
  const [session, setSession] = useState<Session | null>(null)
  const [currentIdx, setCurrentIdx] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [timings, setTimings] = useState<Record<string, number>>({})
  const [selected, setSelected] = useState<string | null>(null)
  const [timeLeft, setTimeLeft] = useState(TIME_PER_Q)
  const [error, setError] = useState('')
  const [gemCost, setGemCost] = useState<number | null>(null)
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null)
  const [flashSelected, setFlashSelected] = useState<string | null>(null)

  const sessionRef = useRef<Session | null>(null)
  const answersRef = useRef<Record<string, string>>({})
  const timingsRef = useRef<Record<string, number>>({})
  const currentIdxRef = useRef(0)
  const answerCountRef = useRef(0)

  useEffect(() => { sessionRef.current = session }, [session])
  useEffect(() => { answersRef.current = answers }, [answers])
  useEffect(() => { timingsRef.current = timings }, [timings])
  useEffect(() => { currentIdxRef.current = currentIdx }, [currentIdx])

  useEffect(() => {
    fetch('/api/gems/costs')
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data?.trial?.[difficulty] !== undefined) setGemCost(data.trial[difficulty])
      })
      .catch(() => {})

    fetch('/api/exams/active')
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        const s = data?.session as ActiveSession | null
        if (!s) return
        const subjectMatch =
          s.subject.toLowerCase().replace(/\s+/g, '_') === subject.toLowerCase().replace(/\s+/g, '_') ||
          s.subject.toLowerCase() === subject.toLowerCase()
        if (subjectMatch && s.difficulty === difficulty) setActiveSession(s)
      })
      .catch(() => {})
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const saveCheckpoint = useCallback(() => {
    const s = sessionRef.current
    if (!s) return
    fetch(`/api/exams/${s.session_id}/checkpoint`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        state: { currentIdx: currentIdxRef.current, answers: answersRef.current, timings: timingsRef.current },
      }),
    }).catch(() => {})
  }, [])

  useEffect(() => {
    function onVisibility() {
      if (document.visibilityState === 'hidden' && sessionRef.current) saveCheckpoint()
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [saveCheckpoint])

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

  function applySession(data: Session, checkpointState?: ActiveSession['checkpoint']) {
    setSession(data)
    if (typeof data.balance_after === 'number') {
      window.dispatchEvent(new CustomEvent('knowly:gem-update', { detail: { balance: data.balance_after } }))
    }
    if (checkpointState?.state) {
      const { currentIdx: savedIdx, answers: savedAnswers, timings: savedTimings } = checkpointState.state
      setCurrentIdx(savedIdx ?? 0)
      setAnswers(savedAnswers ?? {})
      setTimings(savedTimings ?? {})
      answerCountRef.current = Object.keys(savedAnswers ?? {}).length
    }
    setPhase('exam')
    setTimeLeft(TIME_PER_Q)
  }

  async function startExam() {
    setPhase('loading')
    setError('')
    try {
      if (activeSession) {
        await fetch(`/api/exams/${activeSession.session_id}/cancel`, { method: 'POST' }).catch(() => {})
        setActiveSession(null)
      }
      const res = await fetch('/api/exams/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject, difficulty }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.message ?? 'Failed to start trial'); setPhase('confirm'); return }
      applySession(data)
    } catch {
      setError('Something went wrong. Please try again.')
      setPhase('confirm')
    }
  }

  async function resumeExam() {
    if (!activeSession) return
    setPhase('loading')
    setError('')
    try {
      const res = await fetch(`/api/exams/${activeSession.session_id}/resume`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) { setError(data.message ?? 'Failed to resume trial'); setPhase('confirm'); return }
      applySession(data, data.checkpoint)
    } catch {
      setError('Something went wrong. Please try again.')
      setPhase('confirm')
    }
  }

  const handleNext = useCallback((overrideAnswer?: string) => {
    if (!currentQ) return
    const ans = overrideAnswer !== undefined ? overrideAnswer : (selected ?? '')
    const spent = TIME_PER_Q - timeLeft
    const newAnswers = { ...answersRef.current, [currentQ.question_id]: ans }
    const newTimings = { ...timingsRef.current, [currentQ.question_id]: spent }

    setAnswers(newAnswers)
    setTimings(newTimings)
    setSelected(null)
    setFlashSelected(null)
    setTimeLeft(TIME_PER_Q)

    answerCountRef.current += 1
    if (answerCountRef.current % 3 === 0) {
      const s = sessionRef.current
      if (s) {
        fetch(`/api/exams/${s.session_id}/checkpoint`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            state: { currentIdx: currentIdxRef.current + 1, answers: newAnswers, timings: newTimings },
          }),
        }).catch(() => {})
      }
    }

    if (currentIdx + 1 < total) {
      setCurrentIdx((i) => i + 1)
    } else {
      submitExam(newAnswers, newTimings)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIdx, total, selected, currentQ, timeLeft])

  async function submitExam(finalAnswers: Record<string, string>, finalTimings: Record<string, number> = {}) {
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
      time_taken_seconds: finalTimings[q.question_id] ?? 0,
    }))
    try {
      const res = await fetch(`/api/exams/${session.session_id}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers: payload }),
      })
      const data = await res.json()
      if (!res.ok) { setError('Submission failed'); return }
      sessionStorage.setItem('trial_result', JSON.stringify({ ...data, subject, difficulty }))
      router.push(`/child/trials/${encodedSubject}/${difficulty}/results`)
    } catch {
      setError('Failed to submit. Please try again.')
      setPhase('exam')
    }
  }

  // ── Confirm ───────────────────────────────────────────────────────────────
  if (phase === 'confirm') {
    return (
      <div className="flex flex-col gap-4 animate-fade-in-up">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="btn btn-circle btn-sm btn-ghost border border-base-300">‹</button>
          <Breadcrumb crumbs={[
            { label: 'Home', href: '/child/home' },
            { label: 'Trials', href: '/child/trials' },
            { label: subject, href: `/child/trials/${encodedSubject}` },
            { label: DIFFICULTY_LABEL[difficulty] ?? difficulty },
          ]} />
        </div>

        <div className="card bg-base-200 rounded-2xl p-6 flex flex-col items-center gap-6 mt-4">
          <h2 className="text-2xl font-bold">{subject}</h2>
          <p className="text-base-content/60">{DIFFICULTY_LABEL[difficulty] ?? difficulty} Trial</p>

          {activeSession ? (
            <>
              <div className="w-full bg-base-100 rounded-xl p-4 flex flex-col gap-1 border border-base-300">
                <p className="font-semibold text-sm">Unfinished trial detected</p>
                <p className="text-xs text-base-content/60">
                  {activeSession.checkpoint ? 'Your progress was saved.' : "No saved progress — you'll start from the beginning."}
                </p>
              </div>
              {error && <div className="alert alert-error py-2 text-sm w-full"><span>{error}</span></div>}
              <button onClick={resumeExam} className="btn btn-primary btn-lg w-full">Resume Trial</button>
              <div className="divider text-xs text-base-content/40 my-0">or</div>
              <div className="w-full flex flex-col gap-2">
                <button onClick={startExam} className="btn btn-outline w-full">Start New Trial</button>
                <p className="text-xs text-center text-base-content/50">
                  This will abandon the unfinished trial and spend {gemCost ?? '…'} gem{gemCost !== 1 ? 's' : ''}.
                </p>
              </div>
              <button onClick={() => router.back()} className="btn btn-ghost w-full btn-sm">Cancel</button>
            </>
          ) : (
            <>
              <div className="flex items-center gap-3 bg-base-100 rounded-xl px-6 py-4">
                <Image src="/icons/blue-gem.png" alt="Blue gem" width={32} height={32} />
                <div>
                  <p className="text-sm text-base-content/60">Cost</p>
                  <p className="text-xl font-bold">{gemCost ?? '…'} Blue Gem{gemCost !== 1 ? 's' : ''}</p>
                </div>
              </div>
              {error && <div className="alert alert-error py-2 text-sm w-full"><span>{error}</span></div>}
              <button onClick={startExam} className="btn btn-neutral btn-lg w-full">Start Trial</button>
              <button onClick={() => router.back()} className="btn btn-ghost w-full">Cancel</button>
            </>
          )}
        </div>
      </div>
    )
  }

  // ── Loading / Submitting ──────────────────────────────────────────────────
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

  const mmNum = Math.floor(timeLeft / 60)
  const ssNum = timeLeft % 60
  const timerColor =
    timeLeft <= 10 ? 'text-error' :
    timeLeft <= 30 ? 'text-warning' :
    'text-base-content'
  const timerPulse = timeLeft <= 10 ? 'animate-pulse' : ''

  return (
    <div className="flex flex-col gap-3 pb-4">
      {/* ── Timer + progress bar ── */}
      <div className="rounded-2xl bg-base-200 px-4 py-3 flex items-center justify-between shadow-sm">
        {/* Countdown display */}
        <div className={`flex items-center gap-0.5 font-mono font-black text-2xl ${timerColor} ${timerPulse}`}>
          <span className="countdown">
            <span style={{ '--value': mmNum } as React.CSSProperties} />
          </span>
          <span className="mb-0.5">:</span>
          <span className="countdown">
            <span style={{ '--value': ssNum } as React.CSSProperties} />
          </span>
        </div>

        {/* Q counter */}
        <span className="text-sm font-semibold text-base-content/60">
          Q {currentIdx + 1} <span className="text-base-content/30">/ {total}</span>
        </span>

        {/* Save & exit */}
        <button
          onClick={() => { saveCheckpoint(); router.back() }}
          className="btn btn-ghost btn-xs gap-1 text-base-content/40"
        >
          ‹ Exit
        </button>
      </div>

      {/* Answer tracker dots */}
      <div className="flex gap-1.5 justify-center flex-wrap px-1">
        {questions.map((q, i) => (
          <div
            key={q.question_id}
            className={`rounded-full transition-all duration-300 ${
              i === currentIdx
                ? 'w-3 h-3 bg-primary ring-2 ring-primary ring-offset-1'
                : answers[q.question_id]
                ? 'w-2 h-2 bg-primary/50'
                : 'w-2 h-2 bg-base-300'
            }`}
          />
        ))}
      </div>

      {/* Question card */}
      <div
        key={`q-${currentIdx}`}
        className="card bg-base-200 rounded-2xl p-5 shadow-sm animate-fade-in-right"
      >
        <p className="text-base leading-relaxed font-medium">
          <QuestionRenderer text={currentQ.question ?? currentQ.question_text ?? ''} />
        </p>
      </div>

      {/* Answer options */}
      <div className="flex flex-col gap-2.5">
        {Object.entries(currentQ.options).map(([key, value]) => {
          const isSelected = selected === key || flashSelected === key
          const isOther = (selected !== null || flashSelected !== null) && !isSelected
          return (
            <button
              key={key}
              onClick={() => {
                if (selected || flashSelected) return
                soundSelect()
                haptic(HAPTIC_SELECT)
                setFlashSelected(key)
                setSelected(key)
                setTimeout(() => handleNext(key), 600)
              }}
              className={`flex items-center gap-3 p-3.5 rounded-xl border-2 text-left
                transition-all duration-150 active:scale-95
                ${isSelected
                  ? 'border-primary bg-primary text-primary-content font-semibold scale-[1.01]'
                  : isOther
                  ? 'border-base-300 bg-base-100 opacity-40'
                  : 'border-base-300 bg-base-100 hover:bg-base-200 hover:border-base-400'
                }`}
            >
              <span className={`font-bold w-6 shrink-0 text-sm ${isSelected ? 'text-primary-content' : ''}`}>
                {key}.
              </span>
              <span className="text-sm leading-snug">
                <QuestionRenderer text={value} />
              </span>
            </button>
          )
        })}
      </div>

      {/* Tip hint */}
      {currentQ.tip && (
        <div className="collapse collapse-arrow bg-base-200 rounded-xl">
          <input type="checkbox" />
          <div className="collapse-title text-sm py-2 min-h-0 font-medium">💡 Need a hint?</div>
          <div className="collapse-content text-sm text-base-content/70 leading-relaxed">
            {currentQ.tip}
          </div>
        </div>
      )}

      {/* Skip */}
      <div className="flex justify-end">
        <button onClick={() => handleNext()} className="btn btn-ghost btn-sm text-base-content/40">
          {currentIdx + 1 === total ? 'Finish ›' : 'Skip ›'}
        </button>
      </div>

      {/* Footer breadcrumb */}
      <div className="border-t border-base-200 pt-3 mt-1">
        <p className="font-semibold text-sm">{subject}</p>
        <Breadcrumb crumbs={[
          { label: 'Home', href: '/child/home' },
          { label: 'Trials', href: '/child/trials' },
          { label: subject, href: `/child/trials/${encodedSubject}` },
          { label: 'Trial' },
        ]} />
      </div>
    </div>
  )
}
