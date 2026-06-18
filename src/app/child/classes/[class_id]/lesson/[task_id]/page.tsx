'use client'

import { use, useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Breadcrumb from '@/components/child/Breadcrumb'
import QuestionRenderer from '@/components/QuestionRenderer'

interface KnowledgeCheck {
  question: string
  options: Record<string, string>
  correct_answer: string
  explanation: string
  tip?: string
  question_number: number
}

interface WorkedExample {
  context: string
  problem: string
  solution: (string | Record<string, string>)[]
  example_number: number
}

interface Section {
  section_number: number
  title: string
  content?: string
  explanation?: string[]
  knowledge_check?: KnowledgeCheck[]
  worked_examples?: WorkedExample[]
}

interface LessonData {
  quest_id: string
  module_title?: string
  title?: string
  subject: string
  content?: { sections: Section[] }
  sections?: Section[]
}

interface WrongItem {
  sectionTitle: string
  check: KnowledgeCheck
  attempts: number
}

type Phase =
  | 'loading'
  | 'confirm'
  | 'starting'
  | 'lesson'
  | 'quiz'
  | 'quiz_feedback'
  | 'review'
  | 'review_feedback'
  | 'completing'
  | 'error'

export default function ClassLessonPage({
  params,
}: {
  params: Promise<{ class_id: string; task_id: string }>
}) {
  const { class_id, task_id } = use(params)
  const searchParams = useSearchParams()
  const router = useRouter()

  const title   = searchParams.get('title')   ?? 'Lesson'
  const subject = searchParams.get('subject') ?? ''
  const refId   = searchParams.get('ref')     ?? ''
  const sectionParam = searchParams.get('section')
  const singleSection: number | null = sectionParam !== null ? parseInt(sectionParam, 10) : null

  const [phase, setPhase]       = useState<Phase>(refId ? 'loading' : 'error')
  const [lesson, setLesson]     = useState<LessonData | null>(null)
  const [sections, setSections] = useState<Section[]>([])
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [error, setError]       = useState(refId ? '' : 'No lesson has been linked to this task. Please ask your teacher.')

  const [sectionIdx, setSectionIdx]         = useState(0)
  const [paraIdx, setParaIdx]               = useState(0)
  const [checkIdx, setCheckIdx]             = useState(0)
  const [selected, setSelected]             = useState<string | null>(null)
  const [isCorrect, setIsCorrect]           = useState<boolean | null>(null)
  const [wrongPool, setWrongPool]           = useState<WrongItem[]>([])
  const [reviewIdx, setReviewIdx]           = useState(0)
  const [reviewSelected, setReviewSelected] = useState<string | null>(null)
  const [reviewCorrect, setReviewCorrect]   = useState<boolean | null>(null)

  useEffect(() => {
    if (!refId) return
    async function load() {
      try {
        const res = await fetch(`/api/lessons/${refId}`)
        if (!res.ok) throw new Error('Lesson not found')
        const data: LessonData = await res.json()
        setLesson(data)
        const raw = data.content?.sections ?? data.sections ?? []
        setSections(raw.map((sec) => ({
          ...sec,
          explanation: sec.explanation ?? (sec.content ? [sec.content] : []),
          knowledge_check: sec.knowledge_check ?? [],
        })))
        setPhase('confirm')
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load lesson')
        setPhase('error')
      }
    }
    load()
  }, [refId])

  const currentSection  = sections[sectionIdx]
  const currentPara     = currentSection?.explanation?.[paraIdx] ?? ''
  const isLastPara      = paraIdx >= (currentSection?.explanation?.length ?? 1) - 1
  const currentCheck    = currentSection?.knowledge_check?.[checkIdx]
  const totalSections   = sections.length
  const completedSections = sectionIdx
  const progressPct     = totalSections === 0 ? 0 : Math.round((completedSections / totalSections) * 100)

  async function startLesson() {
    setPhase('starting')
    setError('')
    try {
      const res = await fetch('/api/lessons/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quest_id: refId, source: 'assignment', task_id: parseInt(task_id, 10) }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message ?? 'Failed to start lesson')
      setSessionId(data.session_id)
      setSectionIdx(singleSection ?? 0)
      setParaIdx(0)
      setCheckIdx(0)
      setWrongPool([])
      setPhase('lesson')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to start lesson')
      setPhase('confirm')
    }
  }

  function advanceLesson() {
    if (!isLastPara) {
      setParaIdx((p) => p + 1)
      return
    }
    const checks = currentSection?.knowledge_check ?? []
    const isLastSection = singleSection !== null || sectionIdx + 1 >= sections.length
    if (checks.length > 0) {
      setCheckIdx(0)
      setSelected(null)
      setIsCorrect(null)
      setPhase('quiz')
    } else if (!isLastSection) {
      setSectionIdx((i) => i + 1)
      setParaIdx(0)
      setCheckIdx(0)
      setPhase('lesson')
    } else {
      wrongPool.length > 0 ? setPhase('review') : completeLesson()
    }
  }

  function submitAnswer() {
    if (!selected || !currentCheck) return
    const correct = selected === currentCheck.correct_answer
    setIsCorrect(correct)
    if (!correct) {
      setWrongPool((pool) => [...pool, { sectionTitle: currentSection.title, check: currentCheck, attempts: 1 }])
    }
    setPhase('quiz_feedback')
  }

  function advanceQuiz() {
    const checks = currentSection?.knowledge_check ?? []
    const isLastSection = singleSection !== null || sectionIdx + 1 >= sections.length
    if (checkIdx + 1 < checks.length) {
      setCheckIdx((i) => i + 1)
      setSelected(null)
      setIsCorrect(null)
      setPhase('quiz')
    } else if (!isLastSection) {
      setSectionIdx((i) => i + 1)
      setParaIdx(0)
      setCheckIdx(0)
      setSelected(null)
      setIsCorrect(null)
      setPhase('lesson')
    } else {
      wrongPool.length > 0 ? setPhase('review') : completeLesson()
    }
  }

  function submitReview() {
    if (!reviewSelected) return
    const correct = reviewSelected === wrongPool[reviewIdx].check.correct_answer
    setReviewCorrect(correct)
    setPhase('review_feedback')
  }

  function advanceReview() {
    const item = wrongPool[reviewIdx]
    const correct = reviewCorrect
    let newPool = wrongPool.filter((_, i) => i !== reviewIdx)
    if (!correct) newPool = [...newPool, { ...item, attempts: item.attempts + 1 }]
    setWrongPool(newPool)
    if (newPool.length === 0) {
      completeLesson()
    } else {
      setReviewIdx(0)
      setReviewSelected(null)
      setReviewCorrect(null)
      setPhase('review')
    }
  }

  async function completeLesson() {
    setPhase('completing')
    try {
      await fetch('/api/lessons/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId }),
      })
      sessionStorage.setItem(
        `lesson_result_class_${task_id}`,
        JSON.stringify({
          title: lesson?.module_title ?? lesson?.title ?? title,
          subject,
          sections_total: sections.length,
          class_id,
          task_id,
        })
      )
      router.push(`/child/classes/${class_id}/lesson/${task_id}/results`)
    } catch {
      setError('Could not save progress. Please try again.')
      setPhase('quiz')
    }
  }

  const breadcrumbs = [
    { label: 'Home', href: '/child/home' },
    { label: 'Classes', href: '/child/classes' },
    { label: 'Class', href: `/child/classes/${class_id}` },
    { label: 'Lesson' },
  ]

  if (phase === 'loading' || phase === 'starting' || phase === 'completing') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <span className="loading loading-spinner loading-lg text-primary" />
        <p className="text-base-content/60 text-sm">
          {phase === 'completing' ? 'Saving your progress…' : 'Loading lesson…'}
        </p>
      </div>
    )
  }

  if (phase === 'error') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center px-4">
        <div className="text-5xl">😕</div>
        <p className="text-base-content/60">{error || 'Something went wrong.'}</p>
        <Link href={`/child/classes/${class_id}`} className="btn btn-primary btn-sm">Back to Class</Link>
      </div>
    )
  }

  if (phase === 'confirm') {
    const displaySections = singleSection !== null
      ? sections.filter((_, i) => i === singleSection)
      : sections
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <Link href={`/child/classes/${class_id}`} className="btn btn-circle btn-sm btn-ghost border border-base-300">‹</Link>
          <Breadcrumb crumbs={breadcrumbs} />
        </div>

        <div>
          {subject && <span className="badge badge-ghost badge-sm mb-2">{subject}</span>}
          <h1 className="text-2xl font-bold">{lesson?.module_title ?? lesson?.title ?? title}</h1>
          <p className="text-base-content/60 text-sm mt-1">
            {singleSection !== null
              ? `Section ${singleSection + 1} only`
              : `${sections.length} section${sections.length !== 1 ? 's' : ''}`}
          </p>
        </div>

        {displaySections.length > 0 && (
          <div className="flex flex-col gap-2">
            {displaySections.map((s, i) => {
              const globalIdx = singleSection !== null ? singleSection : i
              return (
                <div key={s.section_number ?? globalIdx} className={`flex items-center gap-3 p-3 rounded-xl ${singleSection !== null ? 'bg-primary/10 border border-primary/20' : 'bg-base-200'}`}>
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${singleSection !== null ? 'bg-primary text-primary-content' : 'bg-primary/20 text-primary'}`}>
                    {s.section_number ?? globalIdx + 1}
                  </div>
                  <p className="text-sm font-medium">{s.title}</p>
                  {singleSection !== null && <span className="badge badge-primary badge-sm ml-auto">Assigned</span>}
                </div>
              )
            })}
          </div>
        )}

        {error && <div className="alert alert-error text-sm py-2">{error}</div>}

        <div className="sticky bottom-0 bg-base-100 pt-3 pb-2 -mx-4 px-4 border-t border-base-200">
          <p className="text-xs text-base-content/50 mb-3">Assigned by your teacher — no gems required</p>
          <button className="btn btn-primary w-full" onClick={startLesson}>
            ▶ {singleSection !== null ? `Start Section ${singleSection + 1}` : 'Start Lesson'}
          </button>
        </div>
      </div>
    )
  }

  if (phase === 'lesson') {
    const examples = currentSection?.worked_examples ?? []
    return (
      <div className="flex flex-col gap-4 min-h-[calc(100vh-8rem)]">
        <div className="flex items-center gap-2">
          <div className="flex-1 bg-base-300 rounded-full h-2">
            <div className="h-2 rounded-full bg-primary transition-all duration-500" style={{ width: `${progressPct}%` }} />
          </div>
          <span className="text-xs text-base-content/40 shrink-0">{completedSections}/{totalSections}</span>
        </div>
        <div>
          <p className="text-xs text-base-content/40 uppercase tracking-wide font-medium">
            Section {currentSection?.section_number ?? (sectionIdx + 1)} of {totalSections}
          </p>
          <h2 className="text-xl font-bold mt-0.5">{currentSection?.title}</h2>
        </div>

        {examples.length > 0 && (
          <div className="flex flex-col gap-3">
            {examples.map((ex, exIdx) => (
              <div key={exIdx} className="rounded-2xl bg-base-200 p-4 text-sm">
                <p className="font-semibold text-primary mb-1">Example {ex.example_number}</p>
                {ex.context && <p className="text-base-content/70 mb-2 text-xs">{ex.context}</p>}
                <p className="font-medium mb-2"><QuestionRenderer text={ex.problem} /></p>
                <div className="flex flex-col gap-1 mt-2 pl-3 border-l-2 border-primary/30">
                  {ex.solution.map((step, si) =>
                    typeof step === 'string' ? (
                      <p key={si} className="text-base-content/80 text-xs"><QuestionRenderer text={step} /></p>
                    ) : (
                      <div key={si} className="grid grid-cols-[1fr_auto] gap-x-4 text-xs">
                        {Object.entries(step).map(([k, v]) => (
                          <span key={k}><QuestionRenderer text={`${k}: ${v}`} /></span>
                        ))}
                      </div>
                    )
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex-1 rounded-2xl bg-base-200 p-5">
          <p className="text-base leading-relaxed text-base-content"><QuestionRenderer text={currentPara} /></p>
          {(currentSection?.explanation?.length ?? 0) > 1 && (
            <p className="text-xs text-base-content/40 mt-4 text-right">
              {paraIdx + 1} / {currentSection!.explanation!.length}
            </p>
          )}
        </div>
        <button className="btn btn-primary w-full" onClick={advanceLesson}>
          {isLastPara ? 'Check Your Understanding →' : 'Next →'}
        </button>
      </div>
    )
  }

  if (phase === 'quiz') {
    const checks = currentSection?.knowledge_check ?? []
    return (
      <div className="flex flex-col gap-4 min-h-[calc(100vh-8rem)]">
        <div className="flex items-center gap-2">
          <div className="flex-1 bg-base-300 rounded-full h-2">
            <div className="h-2 rounded-full bg-primary transition-all duration-500" style={{ width: `${progressPct}%` }} />
          </div>
          <span className="text-xs text-base-content/40 shrink-0">{completedSections}/{totalSections}</span>
        </div>
        <div>
          <p className="text-xs text-primary uppercase tracking-wide font-semibold">✏️ Check Your Understanding</p>
          <p className="text-xs text-base-content/40 mt-0.5">
            {currentSection?.title} · Q{checkIdx + 1} of {checks.length}
          </p>
        </div>
        {currentCheck?.tip && (
          <div className="collapse collapse-arrow bg-base-200 rounded-xl">
            <input type="checkbox" />
            <div className="collapse-title text-xs py-2 min-h-0 font-medium">💡 Hint</div>
            <div className="collapse-content text-xs text-base-content/70 leading-relaxed">{currentCheck.tip}</div>
          </div>
        )}
        <div className="rounded-2xl bg-base-200 p-5">
          <p className="text-base font-medium leading-relaxed"><QuestionRenderer text={currentCheck?.question ?? ''} /></p>
        </div>
        <div className="flex flex-col gap-3">
          {Object.entries(currentCheck?.options ?? {}).map(([key, value]) => (
            <button
              key={key}
              onClick={() => setSelected(key)}
              className={`flex items-center gap-3 p-4 rounded-xl border-2 text-left transition-colors ${
                selected === key
                  ? 'border-primary bg-primary/10 text-primary font-semibold'
                  : 'border-base-300 bg-base-100 hover:bg-base-200'
              }`}
            >
              <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                selected === key ? 'bg-primary text-primary-content' : 'bg-base-300'
              }`}>{key}</span>
              <span><QuestionRenderer text={value} /></span>
            </button>
          ))}
        </div>
        <button className="btn btn-primary w-full mt-auto" onClick={submitAnswer} disabled={!selected}>
          Submit Answer
        </button>
      </div>
    )
  }

  if (phase === 'quiz_feedback') {
    return (
      <div className="flex flex-col gap-4 min-h-[calc(100vh-8rem)]">
        <div className={`rounded-2xl p-5 ${isCorrect ? 'bg-success/10 border border-success/20' : 'bg-error/10 border border-error/20'}`}>
          <p className={`text-xl font-bold ${isCorrect ? 'text-success' : 'text-error'}`}>
            {isCorrect ? '✓ Correct!' : '✗ Not quite'}
          </p>
          {!isCorrect && (
            <p className="text-sm font-semibold mt-2">
              Correct answer: <span className="text-success">
                {currentCheck?.correct_answer} — <QuestionRenderer text={currentCheck?.options[currentCheck.correct_answer] ?? ''} />
              </span>
            </p>
          )}
          {currentCheck?.explanation && (
            <div className="collapse collapse-arrow bg-base-200 rounded-lg mt-3">
              <input type="checkbox" />
              <div className="collapse-title text-xs py-1.5 min-h-0 font-medium">📝 Explanation</div>
              <div className="collapse-content text-xs text-base-content/70 leading-relaxed">{currentCheck.explanation}</div>
            </div>
          )}
        </div>
        {!isCorrect && (
          <p className="text-xs text-base-content/40 text-center">📌 This question will be reviewed again at the end</p>
        )}
        <button className="btn btn-primary w-full mt-auto" onClick={advanceQuiz}>Continue →</button>
      </div>
    )
  }

  if (phase === 'review') {
    const item = wrongPool[reviewIdx]
    return (
      <div className="flex flex-col gap-4 min-h-[calc(100vh-8rem)]">
        <div className="rounded-2xl bg-warning/10 border border-warning/20 p-4">
          <p className="text-sm font-semibold text-warning">📌 Review Round</p>
          <p className="text-xs text-base-content/60 mt-1">
            {wrongPool.length} question{wrongPool.length !== 1 ? 's' : ''} left to master
          </p>
        </div>
        <div><p className="text-xs text-base-content/40">{item.sectionTitle}</p></div>
        <div className="rounded-2xl bg-base-200 p-5">
          <p className="text-base font-medium leading-relaxed"><QuestionRenderer text={item.check.question} /></p>
        </div>
        <div className="flex flex-col gap-3">
          {Object.entries(item.check.options).map(([key, value]) => (
            <button
              key={key}
              onClick={() => setReviewSelected(key)}
              className={`flex items-center gap-3 p-4 rounded-xl border-2 text-left transition-colors ${
                reviewSelected === key
                  ? 'border-primary bg-primary/10 text-primary font-semibold'
                  : 'border-base-300 bg-base-100 hover:bg-base-200'
              }`}
            >
              <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                reviewSelected === key ? 'bg-primary text-primary-content' : 'bg-base-300'
              }`}>{key}</span>
              <span><QuestionRenderer text={value} /></span>
            </button>
          ))}
        </div>
        <button className="btn btn-primary w-full mt-auto" onClick={submitReview} disabled={!reviewSelected}>
          Submit Answer
        </button>
      </div>
    )
  }

  if (phase === 'review_feedback') {
    const item = wrongPool[reviewIdx]
    return (
      <div className="flex flex-col gap-4 min-h-[calc(100vh-8rem)]">
        <div className={`rounded-2xl p-5 ${reviewCorrect ? 'bg-success/10 border border-success/20' : 'bg-error/10 border border-error/20'}`}>
          <p className={`text-xl font-bold ${reviewCorrect ? 'text-success' : 'text-error'}`}>
            {reviewCorrect ? '✓ Got it!' : '✗ Keep trying'}
          </p>
          {!reviewCorrect && (
            <p className="text-sm font-semibold mt-2">
              Correct answer: <span className="text-success">
                {item.check.correct_answer} — <QuestionRenderer text={item.check.options[item.check.correct_answer] ?? ''} />
              </span>
            </p>
          )}
          {item.check.explanation && (
            <div className="collapse collapse-arrow bg-base-200 rounded-lg mt-3">
              <input type="checkbox" />
              <div className="collapse-title text-xs py-1.5 min-h-0 font-medium">📝 Explanation</div>
              <div className="collapse-content text-xs text-base-content/70 leading-relaxed">{item.check.explanation}</div>
            </div>
          )}
        </div>
        {!reviewCorrect && (
          <p className="text-xs text-base-content/40 text-center">This question will come back around again</p>
        )}
        <button className="btn btn-primary w-full mt-auto" onClick={advanceReview}>
          {wrongPool.length <= 1 && reviewCorrect ? '🎉 Complete Lesson' : 'Continue →'}
        </button>
      </div>
    )
  }

  return null
}
