'use client'

import { use, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Breadcrumb from '@/components/child/Breadcrumb'

// ── Types ─────────────────────────────────────────────────────────────────────

interface KnowledgeCheck {
  question: string
  options: Record<string, string>
  correct_answer: string
  explanation: string
  question_number: number
}

interface WorkedExample {
  context: string
  problem: string
  solution: string[]
  example_number: number
}

interface Section {
  section_id?: string       // WP store format: "s_001"
  section_number?: number   // Railway format: 1, 2, 3
  title: string
  content?: string          // simple string — normalized to explanation[] on load
  explanation?: string[]
  knowledge_check?: KnowledgeCheck[]
  worked_examples?: WorkedExample[]
  objectives_covered?: string[]
}

interface QuestContent {
  sections: Section[]
}

interface QuestData {
  quest_id: string
  module_title?: string
  title?: string
  subject: string
  topic?: string
  content?: QuestContent
  sections?: Section[]   // in case sections are top-level
  gem_cost?: number
  badge_name?: string
}

interface WrongItem {
  sectionTitle: string
  check: KnowledgeCheck
  attempts: number
}

// ── Phase types ───────────────────────────────────────────────────────────────

type Phase =
  | 'loading'
  | 'confirm'          // gem cost confirmation screen
  | 'starting'         // POST /start
  | 'lesson'           // showing explanation
  | 'quiz'             // knowledge_check MCQ
  | 'quiz_feedback'    // show correct / wrong
  | 'review'           // re-presenting wrong answers
  | 'review_feedback'
  | 'completing'
  | 'error'

// ── Main Component ────────────────────────────────────────────────────────────

export default function QuestDetailPage({
  params,
}: {
  params: Promise<{ subject: string; topic: string; quest_id: string }>
}) {
  const { subject: encodedSubject, topic: encodedTopic, quest_id } = use(params)
  const subject = decodeURIComponent(encodedSubject)
  const topic = decodeURIComponent(encodedTopic)
  const router = useRouter()

  // ── Core state ────────────────────────────────────────────────────────────
  const [phase, setPhase] = useState<Phase>('loading')
  const [quest, setQuest] = useState<QuestData | null>(null)
  const [sections, setSections] = useState<Section[]>([])
  const [sessionId, setSessionId] = useState<string | number | null>(null)
  const [error, setError] = useState('')

  // ── Lesson state ──────────────────────────────────────────────────────────
  const [sectionIdx, setSectionIdx] = useState(0)      // current section index
  const [paraIdx, setParaIdx] = useState(0)             // current paragraph index within explanation

  // ── Quiz state ────────────────────────────────────────────────────────────
  const [checkIdx, setCheckIdx] = useState(0)           // current knowledge_check index
  const [selected, setSelected] = useState<string | null>(null)
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null)

  // ── Wrong pool ────────────────────────────────────────────────────────────
  const [wrongPool, setWrongPool] = useState<WrongItem[]>([])
  const [reviewIdx, setReviewIdx] = useState(0)
  const [reviewSelected, setReviewSelected] = useState<string | null>(null)
  const [reviewCorrect, setReviewCorrect] = useState<boolean | null>(null)

  // ── Load quest ────────────────────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/quests/${quest_id}`)
        if (!res.ok) throw new Error('Quest not found')
        const data: QuestData = await res.json()
        setQuest(data)
        // content may be nested under .content or top-level .sections
        const raw = data.content?.sections ?? data.sections ?? []
        // Normalize: coerce content string → explanation array so the rest of
        // the component always has a consistent shape regardless of source format.
        const s = raw.map((sec) => ({
          ...sec,
          explanation: sec.explanation ?? (sec.content ? [sec.content] : []),
          knowledge_check: sec.knowledge_check ?? [],
        }))
        setSections(s)
        setPhase('confirm')
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load quest')
        setPhase('error')
      }
    }
    load()
  }, [quest_id])

  // ── Derived helpers ───────────────────────────────────────────────────────
  const currentSection = sections[sectionIdx]
  const currentPara = currentSection?.explanation?.[paraIdx] ?? ''
  const isLastPara = paraIdx >= (currentSection?.explanation?.length ?? 1) - 1
  const currentCheck = currentSection?.knowledge_check?.[checkIdx]
  const totalSections = sections.length
  const completedSections = sectionIdx  // sections fully done

  // ── Actions ───────────────────────────────────────────────────────────────

  async function startQuest() {
    setPhase('starting')
    setError('')
    try {
      const res = await fetch('/api/quests/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quest_id, source: 'direct' }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message ?? 'Failed to start quest')
      if (typeof data.balance_after === 'number') {
        window.dispatchEvent(new CustomEvent('knowly:gem-update', { detail: { balance: data.balance_after } }))
      }
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
      const checks = currentSection?.knowledge_check ?? []
      if (checks.length > 0) {
        // Move to quiz for this section
        setCheckIdx(0)
        setSelected(null)
        setIsCorrect(null)
        setPhase('quiz')
      } else {
        // No knowledge checks — advance directly to next section or complete
        if (sectionIdx + 1 < sections.length) {
          setSectionIdx((i) => i + 1)
          setParaIdx(0)
          setCheckIdx(0)
          setPhase('lesson')
        } else {
          wrongPool.length > 0 ? setPhase('review') : completeQuest()
        }
      }
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
      // Section done — move to next section or review
      if (sectionIdx + 1 < sections.length) {
        setSectionIdx((i) => i + 1)
        setParaIdx(0)
        setCheckIdx(0)
        setSelected(null)
        setIsCorrect(null)
        setPhase('lesson')
      } else {
        // All sections done
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
    // Remove from pool if correct, keep (move to end) if wrong again
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
        `quest_result_${quest_id}`,
        JSON.stringify({
          quest_id,
          title: quest?.module_title ?? quest?.title ?? quest_id,
          subject,
          topic,
          sections_total: sections.length,
          sections_completed: sections.length,
          badge_name: data.badge_name ?? quest?.badge_name ?? null,
          badge_earned: data.badge_earned ?? false,
          gems_awarded: data.gems_awarded ?? 0,
          score: 100,
          is_first_completion: data.is_first_completion ?? false,
        })
      )
      router.push(`/child/quests/${encodedSubject}/${encodedTopic}/${quest_id}/results`)
    } catch {
      setError('Could not save progress. Please try again.')
      setPhase('quiz')
    }
  }

  // ── Progress bar value ────────────────────────────────────────────────────
  const progressPct = totalSections === 0 ? 0 :
    Math.round((completedSections / totalSections) * 100)

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────

  // ── Loading ───────────────────────────────────────────────────────────────
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

  // ── Error ─────────────────────────────────────────────────────────────────
  if (phase === 'error') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center">
        <div className="text-5xl">😕</div>
        <p className="text-base-content/60">{error || 'Something went wrong.'}</p>
        <Link href={`/child/quests/${encodedSubject}/${encodedTopic}`} className="btn btn-primary btn-sm">
          Go back
        </Link>
      </div>
    )
  }

  // ── Confirm screen ────────────────────────────────────────────────────────
  if (phase === 'confirm') {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <Link href={`/child/quests/${encodedSubject}/${encodedTopic}`} className="btn btn-circle btn-sm btn-ghost border border-base-300">‹</Link>
          <Breadcrumb crumbs={[
            { label: 'Home', href: '/child/home' },
            { label: 'Quests', href: '/child/quests' },
            { label: subject, href: `/child/quests/${encodedSubject}` },
            { label: topic, href: `/child/quests/${encodedSubject}/${encodedTopic}` },
            { label: quest?.module_title ?? quest_id },
          ]} />
        </div>

        <div>
          <div className="flex gap-2 mb-2">
            <span className="badge badge-ghost badge-sm">{subject}</span>
            <span className="badge badge-ghost badge-sm">{topic}</span>
          </div>
          <h1 className="text-2xl font-bold">{quest?.module_title ?? quest?.title ?? quest_id}</h1>
          <p className="text-base-content/60 text-sm mt-1">{sections.length} section{sections.length !== 1 ? 's' : ''}</p>
        </div>

        {/* Sections list */}
        {sections.length > 0 && (
          <div className="flex flex-col gap-2">
            {sections.map((s, i) => (
              <div key={s.section_id ?? s.section_number ?? i} className="flex items-center gap-3 p-3 rounded-xl bg-base-200">
                <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                  {s.section_number ?? i + 1}
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
            <p className="text-sm font-semibold">{quest?.gem_cost ?? '…'} Blue Gem{quest?.gem_cost !== 1 ? 's' : ''} to start</p>
          </div>
          <button className="btn btn-primary w-full" onClick={startQuest}>
            ▶ Start Quest
          </button>
        </div>
      </div>
    )
  }

  // ── Lesson screen ─────────────────────────────────────────────────────────
  if (phase === 'lesson') {
    return (
      <div className="flex flex-col gap-4 min-h-[calc(100vh-8rem)]">
        {/* Progress */}
        <div className="flex items-center gap-2">
          <div className="flex-1 bg-base-300 rounded-full h-2">
            <div className="h-2 rounded-full bg-primary transition-all duration-500" style={{ width: `${progressPct}%` }} />
          </div>
          <span className="text-xs text-base-content/40 shrink-0">{completedSections}/{totalSections}</span>
        </div>

        {/* Section label */}
        <div>
          <p className="text-xs text-base-content/40 uppercase tracking-wide font-medium">
            Section {currentSection?.section_number ?? (sectionIdx + 1)} of {totalSections}
          </p>
          <h2 className="text-xl font-bold mt-0.5">{currentSection?.title}</h2>
        </div>

        {/* Explanation paragraph */}
        <div className="flex-1 rounded-2xl bg-base-200 p-5">
          <p className="text-base leading-relaxed text-base-content">{currentPara}</p>
          {(currentSection?.explanation?.length ?? 0) > 1 && (
            <p className="text-xs text-base-content/40 mt-4 text-right">
              {paraIdx + 1} / {currentSection?.explanation?.length}
            </p>
          )}
        </div>

        {/* Next button */}
        <button className="btn btn-primary w-full" onClick={advanceLesson}>
          {isLastPara ? 'Check Your Understanding →' : 'Next →'}
        </button>
      </div>
    )
  }

  // ── Quiz screen ───────────────────────────────────────────────────────────
  if (phase === 'quiz') {
    const checks = currentSection?.knowledge_check ?? []
    return (
      <div className="flex flex-col gap-4 min-h-[calc(100vh-8rem)]">
        {/* Progress */}
        <div className="flex items-center gap-2">
          <div className="flex-1 bg-base-300 rounded-full h-2">
            <div className="h-2 rounded-full bg-primary transition-all duration-500" style={{ width: `${progressPct}%` }} />
          </div>
          <span className="text-xs text-base-content/40 shrink-0">{completedSections}/{totalSections}</span>
        </div>

        <div>
          <p className="text-xs text-primary uppercase tracking-wide font-semibold">
            ✏️ Check Your Understanding
          </p>
          <p className="text-xs text-base-content/40 mt-0.5">
            {currentSection?.title} · Q{checkIdx + 1} of {checks.length}
          </p>
        </div>

        {/* Question */}
        <div className="rounded-2xl bg-base-200 p-5">
          <p className="text-base font-medium leading-relaxed">{currentCheck?.question}</p>
        </div>

        {/* Options */}
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

        <button
          className="btn btn-primary w-full mt-auto"
          onClick={submitAnswer}
          disabled={!selected}
        >
          Submit Answer
        </button>
      </div>
    )
  }

  // ── Quiz feedback ─────────────────────────────────────────────────────────
  if (phase === 'quiz_feedback') {
    return (
      <div className="flex flex-col gap-4 min-h-[calc(100vh-8rem)]">
        {/* Result banner */}
        <div className={`rounded-2xl p-5 ${isCorrect ? 'bg-success/10 border border-success/20' : 'bg-error/10 border border-error/20'}`}>
          <p className={`text-xl font-bold ${isCorrect ? 'text-success' : 'text-error'}`}>
            {isCorrect ? '✓ Correct!' : '✗ Not quite'}
          </p>
          <p className="text-sm text-base-content/70 mt-2 leading-relaxed">
            {currentCheck?.explanation}
          </p>
          {!isCorrect && (
            <p className="text-sm font-semibold mt-3">
              Correct answer: <span className="text-success">{currentCheck?.correct_answer} — {currentCheck?.options[currentCheck.correct_answer]}</span>
            </p>
          )}
        </div>

        {!isCorrect && (
          <p className="text-xs text-base-content/40 text-center">
            📌 This question will be reviewed again at the end
          </p>
        )}

        <button className="btn btn-primary w-full mt-auto" onClick={advanceQuiz}>
          Continue →
        </button>
      </div>
    )
  }

  // ── Review wrong answers ──────────────────────────────────────────────────
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

        <div>
          <p className="text-xs text-base-content/40">{item.sectionTitle}</p>
        </div>

        {/* Question */}
        <div className="rounded-2xl bg-base-200 p-5">
          <p className="text-base font-medium leading-relaxed">{item.check.question}</p>
        </div>

        {/* Options */}
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

        <button
          className="btn btn-primary w-full mt-auto"
          onClick={submitReview}
          disabled={!reviewSelected}
        >
          Submit Answer
        </button>
      </div>
    )
  }

  // ── Review feedback ───────────────────────────────────────────────────────
  if (phase === 'review_feedback') {
    const item = wrongPool[reviewIdx]
    return (
      <div className="flex flex-col gap-4 min-h-[calc(100vh-8rem)]">
        <div className={`rounded-2xl p-5 ${reviewCorrect ? 'bg-success/10 border border-success/20' : 'bg-error/10 border border-error/20'}`}>
          <p className={`text-xl font-bold ${reviewCorrect ? 'text-success' : 'text-error'}`}>
            {reviewCorrect ? '✓ Got it!' : '✗ Keep trying'}
          </p>
          <p className="text-sm text-base-content/70 mt-2 leading-relaxed">
            {item.check.explanation}
          </p>
          {!reviewCorrect && (
            <p className="text-sm font-semibold mt-3">
              Correct answer: <span className="text-success">{item.check.correct_answer} — {item.check.options[item.check.correct_answer]}</span>
            </p>
          )}
        </div>

        {!reviewCorrect && (
          <p className="text-xs text-base-content/40 text-center">
            This question will come back around again
          </p>
        )}

        <button className="btn btn-primary w-full mt-auto" onClick={advanceReview}>
          {wrongPool.length <= 1 && reviewCorrect ? '🎉 Complete Quest' : 'Continue →'}
        </button>
      </div>
    )
  }

  return null
}
