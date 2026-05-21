'use client'

import { use, useState, useEffect, useRef, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Volume2, VolumeX } from 'lucide-react'
import QuestionRenderer from '@/components/QuestionRenderer'
import { haptic, HAPTIC_CORRECT, HAPTIC_WRONG, HAPTIC_COMPLETE, HAPTIC_SELECT } from '@/lib/haptic'
import { soundCorrect, soundWrong, soundComplete, soundSelect } from '@/lib/sound'
import { confettiCompletion } from '@/lib/confetti'

// ── Types ─────────────────────────────────────────────────────────────────────

interface KnowledgeCheck {
  question: string
  options: Record<string, string>
  correct_answer: string
  explanation: string
  question_number: number
  tip?: string
}

interface WorkedExample {
  context: string
  problem: string
  solution: (string | Record<string, string>)[]
  example_number: number
}

interface Section {
  section_id?: string
  section_number?: number
  title: string
  content?: string
  explanation?: string[]
  explanation_audio?: (string | null)[]
  knowledge_check?: KnowledgeCheck[]
  worked_examples?: WorkedExample[]
  objectives_covered?: string[]
}

interface QuestData {
  quest_id: string
  module_title?: string
  title?: string
  subject: string
  topic?: string
  content?: { sections: Section[] }
  sections?: Section[]
  gem_cost?: number
  badge_name?: string
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
  | 'section_complete'
  | 'review'
  | 'review_feedback'
  | 'completing'
  | 'error'

const COMBO_MESSAGES: Record<number, string> = {
  3: '🔥 3 in a row!',
  5: '⚡ On fire!',
  8: '💫 Unstoppable!',
  10: '🏆 Legendary!',
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function QuestDetailPage({
  params,
}: {
  params: Promise<{ quest_id: string }>
}) {
  const { quest_id } = use(params)
  const router = useRouter()
  const searchParams = useSearchParams()

  // ?section=N means play only that one section (0-based index into quest sections).
  // When null, the full quest plays through all sections (legacy / future use).
  const sectionParam = searchParams.get('section')
  const singleSection: number | null = sectionParam !== null && !isNaN(Number(sectionParam))
    ? Number(sectionParam)
    : null

  // ?topic= is the curriculum sub-topic name; forwarded to the complete endpoint
  // so that Railway can write an exam_sessions row and update progression status.
  const topicParam = searchParams.get('topic') ?? ''

  // ── Core state ────────────────────────────────────────────────────────────
  const [phase, setPhase] = useState<Phase>('loading')
  const [quest, setQuest] = useState<QuestData | null>(null)
  const [sections, setSections] = useState<Section[]>([])
  const [sessionId, setSessionId] = useState<string | number | null>(null)
  const [error, setError] = useState('')

  // ── Lesson state ──────────────────────────────────────────────────────────
  const [sectionIdx, setSectionIdx] = useState(0)
  const [paraIdx, setParaIdx] = useState(0)

  // ── Quiz state ────────────────────────────────────────────────────────────
  const [checkIdx, setCheckIdx] = useState(0)
  const [selected, setSelected] = useState<string | null>(null)
  const [flashSelected, setFlashSelected] = useState<string | null>(null)
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null)

  // ── Wrong pool ────────────────────────────────────────────────────────────
  const [wrongPool, setWrongPool] = useState<WrongItem[]>([])
  const [reviewIdx, setReviewIdx] = useState(0)
  const [reviewSelected, setReviewSelected] = useState<string | null>(null)
  const [flashReviewSelected, setFlashReviewSelected] = useState<string | null>(null)
  const [reviewCorrect, setReviewCorrect] = useState<boolean | null>(null)

  // ── Gamification state ────────────────────────────────────────────────────
  const [combo, setCombo] = useState(0)
  const comboRef = useRef(0)
  const [comboToast, setComboToast] = useState<string | null>(null)
  const comboTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [shaking, setShaking] = useState(false)

  // ── Audio narration state ─────────────────────────────────────────────────
  const audioRef = useRef<HTMLAudioElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(false)

  // ── Load quest ────────────────────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/quests/${quest_id}`)
        if (!res.ok) throw new Error('Quest not found')
        const data: QuestData = await res.json()
        setQuest(data)
        const raw = data.content?.sections ?? data.sections ?? []
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

  // ── Audio narration effect ────────────────────────────────────────────────
  useEffect(() => {
    if (!audioRef.current) return
    audioRef.current.pause()
    if (phase !== 'lesson') return
    const url = currentSection?.explanation_audio?.[paraIdx] ?? null
    if (!url || isMuted) return
    audioRef.current.src = url
    audioRef.current.load()
    audioRef.current.play().catch(() => {})
  }, [phase, sections, sectionIdx, paraIdx, isMuted]) // sections ensures effect re-fires after load

  // ── Gamification helpers ──────────────────────────────────────────────────

  const showComboToast = useCallback((msg: string) => {
    if (comboTimerRef.current) clearTimeout(comboTimerRef.current)
    setComboToast(msg)
    comboTimerRef.current = setTimeout(() => setComboToast(null), 2200)
  }, [])

  const triggerShake = useCallback(() => {
    setShaking(true)
    setTimeout(() => setShaking(false), 420)
  }, [])

  const handleCorrect = useCallback(() => {
    soundCorrect()
    haptic(HAPTIC_CORRECT)
    const next = comboRef.current + 1
    comboRef.current = next
    setCombo(next)
    if (COMBO_MESSAGES[next]) showComboToast(COMBO_MESSAGES[next])
  }, [showComboToast])

  const handleWrong = useCallback(() => {
    soundWrong()
    haptic(HAPTIC_WRONG)
    comboRef.current = 0
    setCombo(0)
    triggerShake()
  }, [triggerShake])

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
      setSectionIdx(singleSection ?? 0)
      setParaIdx(0)
      setCheckIdx(0)
      setWrongPool([])
      comboRef.current = 0
      setCombo(0)
      setPhase('lesson')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to start quest')
      setPhase('confirm')
    }
  }

  function advanceLesson() {
    if (!isLastPara) {
      setParaIdx((p) => p + 1)
      return
    }
    const checks = currentSection?.knowledge_check ?? []
    if (checks.length > 0) {
      setCheckIdx(0)
      setSelected(null)
      setIsCorrect(null)
      setPhase('quiz')
    } else {
      // Single-section mode: stop here after lesson (no quiz). Full-quest mode: continue.
      const isSessionDone = singleSection !== null || sectionIdx + 1 >= sections.length
      if (isSessionDone) {
        wrongPool.length > 0 ? setPhase('review') : completeQuest()
      } else {
        setPhase('section_complete')
      }
    }
  }

  function advanceSectionComplete() {
    setSectionIdx((i) => i + 1)
    setParaIdx(0)
    setCheckIdx(0)
    setSelected(null)
    setFlashSelected(null)
    setIsCorrect(null)
    setPhase('lesson')
  }

  function submitAnswer(forceAnswer?: string) {
    const ans = forceAnswer ?? selected
    if (!ans || !currentCheck) return
    const correct = ans === currentCheck.correct_answer
    setSelected(ans)
    setIsCorrect(correct)
    if (correct) {
      handleCorrect()
    } else {
      handleWrong()
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
      setFlashSelected(null)
      setIsCorrect(null)
      setPhase('quiz')
    } else {
      // Single-section mode: end after this section's quiz. Full-quest: continue to next section.
      const isSessionDone = singleSection !== null || sectionIdx + 1 >= sections.length
      if (isSessionDone) {
        if (wrongPool.length > 0) {
          setReviewIdx(0)
          setReviewSelected(null)
          setFlashReviewSelected(null)
          setReviewCorrect(null)
          setPhase('review')
        } else {
          completeQuest()
        }
      } else {
        setPhase('section_complete')
      }
    }
  }

  function submitReview(forceAnswer?: string) {
    const ans = forceAnswer ?? reviewSelected
    if (!ans) return
    const item = wrongPool[reviewIdx]
    const correct = ans === item.check.correct_answer
    setReviewSelected(ans)
    setReviewCorrect(correct)
    if (correct) handleCorrect()
    else handleWrong()
    setPhase('review_feedback')
  }

  function advanceReview() {
    const item = wrongPool[reviewIdx]
    let newPool = wrongPool.filter((_, i) => i !== reviewIdx)
    if (!reviewCorrect) {
      newPool = [...newPool, { ...item, attempts: item.attempts + 1 }]
    }
    setWrongPool(newPool)

    if (newPool.length === 0) {
      completeQuest()
    } else {
      setReviewIdx(0)
      setReviewSelected(null)
      setFlashReviewSelected(null)
      setReviewCorrect(null)
      setPhase('review')
    }
  }

  async function completeQuest() {
    setPhase('completing')
    soundComplete()
    haptic(HAPTIC_COMPLETE)
    confettiCompletion()
    try {
      // In single-section mode, mark just that section complete.
      // In full-quest mode, mark all sections complete in sequence.
      const sectionsToComplete = singleSection !== null
        ? [sections[singleSection]]
        : sections

      for (const sec of sectionsToComplete) {
        if (sessionId && sec?.section_id) {
          await fetch(`/api/quests/sessions/${sessionId}/section-complete`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ section_id: sec.section_id }),
          }).catch(() => {}) // non-fatal — continue to complete regardless
        }
      }

      const sectionsCompleted = sectionsToComplete.length
      const res = await fetch('/api/quests/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId,
          sections_completed: sectionsCompleted,
          sections_total: sections.length,
          topic: topicParam,
          subject: quest?.subject ?? '',
          score: 100,
        }),
      })
      const data = await res.json()
      sessionStorage.setItem(
        `quest_result_${quest_id}`,
        JSON.stringify({
          quest_id,
          title: singleSection !== null
            ? (sections[singleSection]?.title ?? quest?.module_title ?? quest_id)
            : (quest?.module_title ?? quest?.title ?? quest_id),
          subject: quest?.subject ?? '',
          topic: singleSection !== null ? (sections[singleSection]?.title ?? '') : (quest?.topic ?? ''),
          sections_total: sections.length,
          sections_completed: sectionsCompleted,
          badge_name: data.badge_name ?? quest?.badge_name ?? null,
          badge_earned: data.badge_earned ?? false,
          gems_awarded: data.gems_awarded ?? 0,
          score: 100,
          is_first_completion: data.is_first_completion ?? false,
        })
      )
      router.push(`/child/quests/${quest_id}/results`)
    } catch {
      setError('Could not save progress. Please try again.')
      setPhase('quiz')
    }
  }

  // ── Combo toast ───────────────────────────────────────────────────────────
  const ComboToast = comboToast ? (
    <div className="fixed top-20 left-0 right-0 z-50 flex justify-center pointer-events-none">
      <div key={comboToast} className="animate-pop-in bg-base-100 border border-base-300 shadow-xl rounded-2xl px-5 py-3 font-bold text-base">
        {comboToast}
      </div>
    </div>
  ) : null

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────

  if (phase === 'loading' || phase === 'starting' || phase === 'completing') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <span className="loading loading-ring loading-lg text-primary" />
        <p className="text-base-content/60 text-sm animate-pulse">
          {phase === 'completing' ? 'Saving your progress…' : 'Loading quest…'}
        </p>
      </div>
    )
  }

  if (phase === 'error') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center">
        <div className="text-5xl">😕</div>
        <p className="text-base-content/60">{error || 'Something went wrong.'}</p>
        <Link href="/child/quests" className="btn btn-primary btn-sm">Back to Quests</Link>
      </div>
    )
  }

  // ── Confirm (pre-start) ───────────────────────────────────────────────────
  if (phase === 'confirm') {
    const activeSection = singleSection !== null ? sections[singleSection] : null
    const moduleTitle = quest?.module_title ?? quest?.title ?? quest_id

    return (
      <div className="flex flex-col gap-5 max-w-lg animate-fade-in-up">
        <Link href="/child/quests" className="btn btn-ghost btn-sm w-fit gap-1 -ml-2">
          ← Quests
        </Link>

        <div>
          {quest?.subject && (
            <span className="badge badge-ghost badge-sm mb-2">{quest.subject}</span>
          )}
          {/* Module title as context */}
          <p className="text-sm text-base-content/40 font-medium mb-0.5">{moduleTitle}</p>
          {/* Section title as the hero */}
          <h1 className="text-2xl font-bold">
            {activeSection?.title ?? moduleTitle}
          </h1>
          {singleSection !== null && (
            <p className="text-xs text-base-content/40 mt-1">
              Section {singleSection + 1} of {sections.length} · Short session
            </p>
          )}
        </div>

        {/* Single-section mode: just show this section. Full mode: show all. */}
        {singleSection !== null && activeSection ? (
          <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10 text-sm text-base-content/70 leading-relaxed">
            <p className="font-semibold text-primary mb-1">What you&apos;ll cover</p>
            {activeSection.objectives_covered?.map((obj, i) => (
              <p key={i} className="text-xs">• {obj}</p>
            )) ?? <p className="text-xs">{activeSection.title}</p>}
          </div>
        ) : sections.length > 0 ? (
          <div className="flex gap-2 flex-wrap">
            {sections.map((s, i) => (
              <div
                key={s.section_id ?? i}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-base-200 text-xs font-medium"
              >
                <span className="w-4 h-4 rounded-full bg-base-300 flex items-center justify-center text-[10px] font-bold">
                  {i + 1}
                </span>
                {s.title}
              </div>
            ))}
          </div>
        ) : null}

        <div className="flex items-center gap-3 p-4 rounded-2xl bg-base-200">
          <span className="text-2xl">💎</span>
          <div>
            <p className="font-semibold text-sm">{quest?.gem_cost ?? '…'} Blue Gem{quest?.gem_cost !== 1 ? 's' : ''} to start</p>
            <p className="text-xs text-base-content/50">Deducted when you begin</p>
          </div>
        </div>

        {error && <div className="alert alert-error text-sm py-2">{error}</div>}

        <button className="btn btn-primary w-full" onClick={startQuest}>
          ▶ Start
        </button>
      </div>
    )
  }

  // ── Section complete milestone ─────────────────────────────────────────────
  if (phase === 'section_complete') {
    const completedSection = sections[sectionIdx]
    const nextSection = sections[sectionIdx + 1]
    const isLastSection = sectionIdx + 1 >= sections.length

    return (
      <div className="flex flex-col items-center gap-6 min-h-[60vh] justify-center text-center animate-fade-in-up">
        <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center text-3xl">✓</div>

        <div>
          <p className="text-xs text-base-content/40 uppercase tracking-wider mb-1">Section Complete</p>
          <h2 className="text-xl font-bold">{completedSection?.title}</h2>
          <p className="text-sm text-base-content/50 mt-1">
            {sectionIdx + 1} of {totalSections} done
          </p>
        </div>

        {/* Progress dots */}
        <div className="flex gap-2">
          {sections.map((_, i) => (
            <div
              key={i}
              className={`w-3 h-3 rounded-full transition-colors ${
                i <= sectionIdx ? 'bg-success' : 'bg-base-300'
              }`}
            />
          ))}
        </div>

        {isLastSection ? (
          <button
            className="btn btn-success w-full max-w-xs"
            onClick={() => wrongPool.length > 0 ? setPhase('review') : completeQuest()}
          >
            {wrongPool.length > 0 ? 'Review & Complete 📝' : 'Complete Quest 🎉'}
          </button>
        ) : (
          <div className="w-full max-w-xs flex flex-col gap-3">
            <div className="p-3 rounded-xl bg-base-200 text-sm font-medium text-center">
              <p className="text-xs text-base-content/40 mb-1">Up next</p>
              {nextSection?.title}
            </div>
            <button className="btn btn-primary w-full" onClick={advanceSectionComplete}>
              Continue →
            </button>
          </div>
        )}
      </div>
    )
  }

  // ── Lesson ────────────────────────────────────────────────────────────────
  if (phase === 'lesson') {
    const examples = currentSection?.worked_examples ?? []
    return (
      <div key={`lesson-${sectionIdx}`} className="flex flex-col gap-4 min-h-[calc(100vh-8rem)] animate-fade-in-up">
        <audio
          ref={audioRef}
          preload="none"
          className="hidden"
          onPlay={() => setIsPlaying(true)}
          onEnded={() => setIsPlaying(false)}
          onPause={() => setIsPlaying(false)}
        />
        {ComboToast}

        {/* Section progress dots */}
        {totalSections > 1 && (
          <div className="flex gap-1.5 justify-center">
            {sections.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all ${
                  i < sectionIdx ? 'w-4 bg-success' : i === sectionIdx ? 'w-6 bg-primary' : 'w-4 bg-base-300'
                }`}
              />
            ))}
          </div>
        )}

        <div>
          <p className="text-xs text-base-content/40 uppercase tracking-wide font-medium">
            {singleSection !== null
              ? `Section ${singleSection + 1} of ${totalSections}`
              : totalSections > 1 ? `Section ${sectionIdx + 1} of ${totalSections}` : 'Lesson'}
          </p>
          <h2 className="text-xl font-bold mt-0.5">{currentSection?.title}</h2>
        </div>

        <div className="relative rounded-2xl bg-base-200 p-8 shadow-sm min-h-[32vh] flex flex-col items-center justify-center gap-3">
          {/* Mute toggle — shown whenever the section has an audio array */}
          {(currentSection?.explanation_audio?.length ?? 0) > 0 && (
            <button
              type="button"
              onClick={() => setIsMuted((m) => !m)}
              className="absolute top-3 right-3 p-1.5 rounded-full text-base-content/30 hover:text-base-content/60 transition-colors"
              aria-label={isMuted ? 'Unmute narration' : 'Mute narration'}
            >
              {isMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
            </button>
          )}

          <p key={`para-${paraIdx}`} className="text-base leading-relaxed text-base-content max-w-xl w-full">
            <QuestionRenderer text={currentPara} splitAnimate />
          </p>

          <div className="flex items-center justify-between w-full max-w-xl self-end">
            {isPlaying && !isMuted ? (
              <span className="text-xs text-base-content/40 flex items-center gap-1">
                <Volume2 size={11} /> Narrating…
              </span>
            ) : <span />}
            {(currentSection?.explanation?.length ?? 0) > 1 && (
              <p className="text-xs text-base-content/40">
                {paraIdx + 1} / {currentSection?.explanation?.length}
              </p>
            )}
          </div>
        </div>

        {examples.length > 0 && (
          <div className="collapse collapse-arrow bg-base-200 rounded-2xl">
            <input type="checkbox" />
            <div className="collapse-title text-sm font-semibold py-3 min-h-0">
              📝 Worked Examples ({examples.length})
            </div>
            <div className="collapse-content flex flex-col gap-5 pt-1">
              {examples.map((ex, exIdx) => (
                <div key={exIdx} className="flex flex-col gap-2">
                  <p className="text-xs font-bold text-primary uppercase tracking-wide">Example {ex.example_number}</p>
                  <p className="text-xs italic text-base-content/60 leading-relaxed">{ex.context}</p>
                  <p className="text-sm font-semibold">{ex.problem}</p>
                  <div className="flex flex-col gap-1 pl-3 border-l-2 border-primary/30">
                    {ex.solution.map((step, i) => (
                      <p key={i} className="text-xs text-base-content/80 leading-relaxed">
                        {typeof step === 'string' ? step : (step as Record<string, string>).step ?? JSON.stringify(step)}
                      </p>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <button className="btn btn-primary w-full" onClick={advanceLesson}>
          {isLastPara ? 'Check Your Understanding →' : 'Next →'}
        </button>
      </div>
    )
  }

  // ── Quiz ──────────────────────────────────────────────────────────────────
  if (phase === 'quiz') {
    const checks = currentSection?.knowledge_check ?? []
    return (
      <div key={`quiz-${sectionIdx}-${checkIdx}`} className="flex flex-col gap-4 min-h-[calc(100vh-8rem)] animate-fade-in-up">
        {ComboToast}

        {totalSections > 1 && (
          <div className="flex gap-1.5 justify-center">
            {sections.map((_, i) => (
              <div key={i} className={`h-1.5 rounded-full transition-all ${
                i < sectionIdx ? 'w-4 bg-success' : i === sectionIdx ? 'w-6 bg-primary' : 'w-4 bg-base-300'
              }`} />
            ))}
          </div>
        )}

        <div>
          <p className="text-xs text-primary uppercase tracking-wide font-semibold">✏️ Check Your Understanding</p>
          <p className="text-xs text-base-content/40 mt-0.5">
            {currentSection?.title} · Q{checkIdx + 1} of {checks.length}
          </p>
        </div>

        <div className="rounded-2xl bg-base-200 p-8 shadow-sm min-h-[32vh] flex items-center justify-center">
          <p className="text-base font-medium leading-relaxed text-center max-w-xl">
            <QuestionRenderer text={currentCheck?.question ?? ''} splitAnimate />
          </p>
        </div>

        <div className="flex flex-col gap-3">
          {Object.entries(currentCheck?.options ?? {}).map(([key, value]) => {
            const isFlashed = flashSelected === key
            const isOther = flashSelected !== null && !isFlashed
            return (
              <button
                key={key}
                onClick={() => {
                  if (flashSelected) return
                  soundSelect()
                  haptic(HAPTIC_SELECT)
                  setFlashSelected(key)
                  setSelected(key)
                  setTimeout(() => submitAnswer(key), 400)
                }}
                className={`flex items-center gap-3 p-4 rounded-xl border-2 text-left transition-all duration-150 active:scale-95 ${
                  isFlashed
                    ? 'border-primary bg-primary text-primary-content font-semibold scale-[1.01]'
                    : isOther
                    ? 'border-base-300 bg-base-100 opacity-40'
                    : 'border-base-300 bg-base-100 hover:bg-base-200'
                }`}
              >
                <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 transition-colors ${
                  isFlashed ? 'bg-primary-content/20 text-primary-content' : 'bg-base-300'
                }`}>{key}</span>
                <span><QuestionRenderer text={value} /></span>
              </button>
            )
          })}
        </div>

        {currentCheck?.tip && (
          <div className="collapse collapse-arrow bg-base-200 rounded-xl">
            <input type="checkbox" />
            <div className="collapse-title text-sm py-2 min-h-0 font-medium">💡 Need a hint?</div>
            <div className="collapse-content text-sm text-base-content/70 leading-relaxed">{currentCheck.tip}</div>
          </div>
        )}
      </div>
    )
  }

  // ── Quiz feedback ─────────────────────────────────────────────────────────
  if (phase === 'quiz_feedback') {
    return (
      <div className="flex flex-col gap-4 min-h-[calc(100vh-8rem)]">
        {ComboToast}
        <div className={`rounded-2xl p-5 shadow-sm animate-fade-in-up ${
          isCorrect ? 'bg-success/10 border border-success/20' : `bg-error/10 border border-error/20 ${shaking ? 'animate-shake' : ''}`
        }`}>
          <p className={`text-2xl font-bold ${isCorrect ? 'text-success' : 'text-error'}`}>
            {isCorrect ? '✓ Correct!' : '✗ Not quite'}
          </p>
          {!isCorrect && currentCheck && (
            <p className="text-sm font-semibold mt-3">
              Correct answer:{' '}
              <span className="text-success">
                {currentCheck.correct_answer} — {currentCheck.options[currentCheck.correct_answer]}
              </span>
            </p>
          )}
          {currentCheck?.explanation && (
            <div className="collapse collapse-arrow bg-base-100/40 rounded-xl mt-3">
              <input type="checkbox" />
              <div className="collapse-title text-sm py-2 min-h-0 font-medium">📝 Explanation</div>
              <div className="collapse-content text-sm text-base-content/70 leading-relaxed">{currentCheck.explanation}</div>
            </div>
          )}
        </div>

        {!isCorrect && (
          <p className="text-xs text-base-content/40 text-center">📌 This question will be reviewed again at the end</p>
        )}
        {combo >= 3 && isCorrect && (
          <div className="text-center text-sm font-semibold text-warning">🔥 {combo} in a row!</div>
        )}

        <button className="btn btn-primary w-full mt-auto" onClick={advanceQuiz}>Continue →</button>
      </div>
    )
  }

  // ── Review ────────────────────────────────────────────────────────────────
  if (phase === 'review') {
    const item = wrongPool[reviewIdx]
    return (
      <div key={`review-${reviewIdx}`} className="flex flex-col gap-4 min-h-[calc(100vh-8rem)] animate-fade-in-up">
        {ComboToast}
        <div className="rounded-2xl bg-warning/10 border border-warning/20 p-4 flex items-center gap-3">
          <span className="text-2xl">🔁</span>
          <div>
            <p className="text-sm font-bold text-warning">Review Round</p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="countdown font-mono text-lg font-bold text-warning">
                <span style={{ '--value': wrongPool.length } as React.CSSProperties} />
              </span>
              <span className="text-xs text-base-content/60">question{wrongPool.length !== 1 ? 's' : ''} left to master</span>
            </div>
          </div>
        </div>

        <p className="text-xs text-base-content/40">{item.sectionTitle}</p>
        <div className="rounded-2xl bg-base-200 p-8 shadow-sm min-h-[32vh] flex items-center justify-center">
          <p className="text-base font-medium leading-relaxed text-center max-w-xl">
            <QuestionRenderer text={item.check.question} splitAnimate />
          </p>
        </div>

        <div className="flex flex-col gap-3">
          {Object.entries(item.check.options).map(([key, value]) => {
            const isFlashed = flashReviewSelected === key
            const isOther = flashReviewSelected !== null && !isFlashed
            return (
              <button
                key={key}
                onClick={() => {
                  if (flashReviewSelected) return
                  soundSelect()
                  haptic(HAPTIC_SELECT)
                  setFlashReviewSelected(key)
                  setReviewSelected(key)
                  setTimeout(() => submitReview(key), 400)
                }}
                className={`flex items-center gap-3 p-4 rounded-xl border-2 text-left transition-all duration-150 active:scale-95 ${
                  isFlashed ? 'border-primary bg-primary text-primary-content font-semibold scale-[1.01]'
                  : isOther ? 'border-base-300 bg-base-100 opacity-40'
                  : 'border-base-300 bg-base-100 hover:bg-base-200'
                }`}
              >
                <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                  isFlashed ? 'bg-primary-content/20 text-primary-content' : 'bg-base-300'
                }`}>{key}</span>
                <span><QuestionRenderer text={value} /></span>
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  // ── Review feedback ───────────────────────────────────────────────────────
  if (phase === 'review_feedback') {
    const item = wrongPool[reviewIdx]
    return (
      <div className="flex flex-col gap-4 min-h-[calc(100vh-8rem)]">
        {ComboToast}
        <div className={`rounded-2xl p-5 shadow-sm animate-fade-in-up ${
          reviewCorrect ? 'bg-success/10 border border-success/20'
          : `bg-error/10 border border-error/20 ${shaking ? 'animate-shake' : ''}`
        }`}>
          <p className={`text-2xl font-bold ${reviewCorrect ? 'text-success' : 'text-error'}`}>
            {reviewCorrect ? '✓ Got it!' : '✗ Keep trying'}
          </p>
          {!reviewCorrect && (
            <p className="text-sm font-semibold mt-3">
              Correct answer:{' '}
              <span className="text-success">{item.check.correct_answer} — {item.check.options[item.check.correct_answer]}</span>
            </p>
          )}
          {item.check.explanation && (
            <div className="collapse collapse-arrow bg-base-100/40 rounded-xl mt-3">
              <input type="checkbox" />
              <div className="collapse-title text-sm py-2 min-h-0 font-medium">📝 Explanation</div>
              <div className="collapse-content text-sm text-base-content/70 leading-relaxed">{item.check.explanation}</div>
            </div>
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
