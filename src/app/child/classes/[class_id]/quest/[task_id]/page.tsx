'use client'

import { use, useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Breadcrumb from '@/components/child/Breadcrumb'

interface KnowledgeCheck {
  question: string
  options: Record<string, string>
  correct_answer: string
  explanation: string
  question_number: number
}

interface Section {
  section_number: number
  title: string
  explanation: string[]
  knowledge_check: KnowledgeCheck[]
}

interface QuestData {
  quest_id: string
  module_title?: string
  title?: string
  subject: string
  content?: { sections: Section[] }
  sections?: Section[]
  gem_cost?: number
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

export default function ClassQuestPage({
  params,
}: {
  params: Promise<{ class_id: string; task_id: string }>
}) {
  const { class_id, task_id } = use(params)
  const searchParams = useSearchParams()
  const router = useRouter()

  const title = searchParams.get('title') ?? 'Quest'
  const subject = searchParams.get('subject') ?? ''
  const gemReward = parseInt(searchParams.get('reward') ?? '0', 10)
  const refId = searchParams.get('ref') ?? ''

  const [phase, setPhase] = useState<Phase>(refId ? 'loading' : 'error')
  const [quest, setQuest] = useState<QuestData | null>(null)
  const [sections, setSections] = useState<Section[]>([])
  const [sessionId, setSessionId] = useState<string | number | null>(null)
  const [error, setError] = useState(refId ? '' : 'No quest has been linked to this task. Please ask your teacher.')

  const [sectionIdx, setSectionIdx] = useState(0)
  const [paraIdx, setParaIdx] = useState(0)
  const [checkIdx, setCheckIdx] = useState(0)
  const [selected, setSelected] = useState<string | null>(null)
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null)
  const [wrongPool, setWrongPool] = useState<WrongItem[]>([])
  const [reviewIdx, setReviewIdx] = useState(0)
  const [reviewSelected, setReviewSelected] = useState<string | null>(null)
  const [reviewCorrect, setReviewCorrect] = useState<boolean | null>(null)

  useEffect(() => {
    if (!refId) return
    async function load() {
      try {
        const res = await fetch(`/api/quests/${refId}`)
        if (!res.ok) throw new Error('Quest not found')
        const data: QuestData = await res.json()
        setQuest(data)
        setSections(data.content?.sections ?? data.sections ?? [])
        setPhase('confirm')
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load quest')
        setPhase('error')
      }
    }
    load()
  }, [refId])

  const currentSection = sections[sectionIdx]
  const currentPara = currentSection?.explanation?.[paraIdx] ?? ''
  const isLastPara = paraIdx >= (currentSection?.explanation?.length ?? 1) - 1
  const currentCheck = currentSection?.knowledge_check?.[checkIdx]
  const totalSections = sections.length
  const completedSections = sectionIdx
  const progressPct = totalSections === 0 ? 0 : Math.round((completedSections / totalSections) * 100)

  async function startQuest() {
    setPhase('starting')
    setError('')
    try {
      const res = await fetch('/api/quests/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quest_id: refId, source: 'assignment', task_id: parseInt(task_id) }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message ?? 'Failed to start quest')
      setSessionId(data.session_id)
      setSectionIdx(0)
      setParaIdx(0)
      setCheckIdx(0)
      setWrongPool([])
      setPhase('lesson')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to start quest')
      setPhase('confirm')
    }
  }

  function advanceLesson() {
    if (!isLastPara) {
      setParaIdx((p) => p + 1)
    } else {
      setCheckIdx(0)
      setSelected(null)
      setIsCorrect(null)
      setPhase('quiz')
    }
  }

  function submitAnswer() {
    if (!selected || !currentCheck) return
    const correct = selected === currentCheck.correct_answer
    setIsCorrect(correct)
    if (!correct) {
      setWrongPool((pool) => [
        ...pool,
        { sectionTitle: currentSection.title, check: currentCheck, attempts: 1 },
      ])
    }
    setPhase('quiz_feedback')
  }

  function advanceQuiz() {
    const checks = currentSection?.knowledge_check ?? []
    if (checkIdx + 1 < checks.length) {
      setCheckIdx((i) => i + 1)
      setSelected(null)
      setIsCorrect(null)
      setPhase('quiz')
    } else {
      if (sectionIdx + 1 < sections.length) {
        setSectionIdx((i) => i + 1)
        setParaIdx(0)
        setCheckIdx(0)
        setSelected(null)
        setIsCorrect(null)
        setPhase('lesson')
      } else {
        if (wrongPool.length > 0) {
          setReviewIdx(0)
          setReviewSelected(null)
          setReviewCorrect(null)
          setPhase('review')
        } else {
          completeQuest()
        }
      }
    }
  }

  function submitReview() {
    if (!reviewSelected) return
    const item = wrongPool[reviewIdx]
    const correct = reviewSelected === item.check.correct_answer
    setReviewCorrect(correct)
    setPhase('review_feedback')
  }

  function advanceReview() {
    const item = wrongPool[reviewIdx]
    const correct = reviewCorrect
    let newPool = wrongPool.filter((_, i) => i !== reviewIdx)
    if (!correct) {
      newPool = [...newPool, { ...item, attempts: item.attempts + 1 }]
    }
    setWrongPool(newPool)
    if (newPool.length === 0) {
      completeQuest()
    } else {
      setReviewIdx(0)
      setReviewSelected(null)
      setReviewCorrect(null)
      setPhase('review')
    }
  }

  async function completeQuest() {
    setPhase('completing')
    try {
      const res = await fetch('/api/quests/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId }),
      })
      const data = await res.json()
      sessionStorage.setItem(
        `quest_result_class_${task_id}`,
        JSON.stringify({
          quest_id: refId,
          title: quest?.module_title ?? quest?.title ?? title,
          subject,
          sections_total: sections.length,
          sections_completed: sections.length,
          badge_name: data.badge_name ?? null,
          badge_earned: data.badge_earned ?? false,
          gems_awarded: data.gems_awarded ?? 0,
          gem_reward: gemReward,
          score: 100,
          class_id,
          task_id,
        })
      )
      router.push(`/child/classes/${class_id}/quest/${task_id}/results`)
    } catch {
      setError('Could not save progress. Please try again.')
      setPhase('quiz')
    }
  }

  const breadcrumbs = [
    { label: 'Home', href: '/child/home' },
    { label: 'Classes', href: '/child/classes' },
    { label: 'Class', href: `/child/classes/${class_id}` },
    { label: 'Quest' },
  ]

  if (phase === 'loading' || phase === 'starting' || phase === 'completing') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <span className="loading loading-spinner loading-lg text-primary" />
        <p className="text-base-content/60 text-sm">
          {phase === 'completing' ? 'Saving your progress…' : 'Loading quest…'}
        </p>
      </div>
    )
  }

  if (phase === 'error') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center px-4">
        <div className="text-5xl">😕</div>
        <p className="text-base-content/60">{error || 'Something went wrong.'}</p>
        <Link href={`/child/classes/${class_id}`} className="btn btn-primary btn-sm">
          Back to Class
        </Link>
      </div>
    )
  }

  if (phase === 'confirm') {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <Link href={`/child/classes/${class_id}`} className="btn btn-circle btn-sm btn-ghost border border-base-300">‹</Link>
          <Breadcrumb crumbs={breadcrumbs} />
        </div>

        <div>
          {subject && <span className="badge badge-ghost badge-sm mb-2">{subject}</span>}
          <h1 className="text-2xl font-bold">{quest?.module_title ?? quest?.title ?? title}</h1>
          <p className="text-base-content/60 text-sm mt-1">{sections.length} section{sections.length !== 1 ? 's' : ''}</p>
        </div>

        {sections.length > 0 && (
          <div className="flex flex-col gap-2">
            {sections.map((s) => (
              <div key={s.section_number} className="flex items-center gap-3 p-3 rounded-xl bg-base-200">
                <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                  {s.section_number}
                </div>
                <p className="text-sm font-medium">{s.title}</p>
              </div>
            ))}
          </div>
        )}

        {error && <div className="alert alert-error text-sm py-2">{error}</div>}

        <div className="sticky bottom-0 bg-base-100 pt-3 pb-2 -mx-4 px-4 border-t border-base-200">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xl">💎</span>
            <p className="text-sm font-semibold">{quest?.gem_cost ?? 3} Blue Gems to start</p>
          </div>
          {gemReward > 0 && (
            <p className="text-xs text-success font-semibold mb-2">+{gemReward} bonus gems on completion</p>
          )}
          <button className="btn btn-primary w-full" onClick={startQuest}>
            ▶ Start Quest
          </button>
        </div>
      </div>
    )
  }

  if (phase === 'lesson') {
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
            Section {currentSection?.section_number} of {totalSections}
          </p>
          <h2 className="text-xl font-bold mt-0.5">{currentSection?.title}</h2>
        </div>
        <div className="flex-1 rounded-2xl bg-base-200 p-5">
          <p className="text-base leading-relaxed text-base-content">{currentPara}</p>
          {currentSection?.explanation.length > 1 && (
            <p className="text-xs text-base-content/40 mt-4 text-right">
              {paraIdx + 1} / {currentSection.explanation.length}
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
        <div className="rounded-2xl bg-base-200 p-5">
          <p className="text-base font-medium leading-relaxed">{currentCheck?.question}</p>
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
              <span>{value}</span>
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
          <p className="text-sm text-base-content/70 mt-2 leading-relaxed">{currentCheck?.explanation}</p>
          {!isCorrect && (
            <p className="text-sm font-semibold mt-3">
              Correct answer: <span className="text-success">{currentCheck?.correct_answer} — {currentCheck?.options[currentCheck.correct_answer]}</span>
            </p>
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
          <p className="text-base font-medium leading-relaxed">{item.check.question}</p>
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
              <span>{value}</span>
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
          <p className="text-sm text-base-content/70 mt-2 leading-relaxed">{item.check.explanation}</p>
          {!reviewCorrect && (
            <p className="text-sm font-semibold mt-3">
              Correct answer: <span className="text-success">{item.check.correct_answer} — {item.check.options[item.check.correct_answer]}</span>
            </p>
          )}
        </div>
        {!reviewCorrect && (
          <p className="text-xs text-base-content/40 text-center">This question will come back around again</p>
        )}
        <button className="btn btn-primary w-full mt-auto" onClick={advanceReview}>
          {wrongPool.length <= 1 && reviewCorrect ? '🎉 Complete Quest' : 'Continue →'}
        </button>
      </div>
    )
  }

  return null
}
