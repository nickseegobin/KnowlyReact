'use client'

import { useState } from 'react'

type Status = 'idle' | 'running' | 'pass' | 'fail'

interface TestResult {
  status: Status
  request?: string
  response?: unknown
  error?: string
}

function StatusBadge({ status }: { status: Status }) {
  if (status === 'idle')    return <span className="badge badge-ghost badge-sm">Idle</span>
  if (status === 'running') return <span className="badge badge-warning badge-sm animate-pulse">Running…</span>
  if (status === 'pass')    return <span className="badge badge-success badge-sm">Pass</span>
  return <span className="badge badge-error badge-sm">Fail</span>
}

function TestCard({
  label,
  result,
  onRun,
}: {
  label: string
  result: TestResult
  onRun: () => void
}) {
  const [expanded, setExpanded] = useState(false)
  return (
    <div className="bg-base-200 rounded-xl p-3 flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium">{label}</span>
        <div className="flex items-center gap-2">
          <StatusBadge status={result.status} />
          <button
            onClick={onRun}
            disabled={result.status === 'running'}
            className="btn btn-xs btn-neutral"
          >
            Run
          </button>
        </div>
      </div>
      {result.status !== 'idle' && (
        <button
          onClick={() => setExpanded((e) => !e)}
          className="text-xs text-left text-base-content/50 hover:text-base-content"
        >
          {expanded ? '▾ Hide' : '▸ Show'} details
        </button>
      )}
      {expanded && (
        <div className="flex flex-col gap-1 text-xs">
          {result.request && (
            <div>
              <p className="font-semibold text-base-content/50 uppercase tracking-wider">Request</p>
              <pre className="bg-base-300 rounded p-2 overflow-auto max-h-24 text-xs whitespace-pre-wrap">{result.request}</pre>
            </div>
          )}
          {result.error && (
            <p className="text-error">{result.error}</p>
          )}
          {result.response !== undefined && (
            <div>
              <p className="font-semibold text-base-content/50 uppercase tracking-wider">Response</p>
              <pre className="bg-base-300 rounded p-2 overflow-auto max-h-48 text-xs whitespace-pre-wrap">
                {JSON.stringify(result.response, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

const SUBJECTS = [
  { value: 'math',           label: 'Mathematics' },
  { value: 'english',        label: 'English Language Arts' },
  { value: 'science',        label: 'Science' },
  { value: 'social_studies', label: 'Social Studies' },
]

const LEVELS  = [{ value: 'std_4', label: 'Standard 4' }, { value: 'std_5', label: 'Standard 5' }]
const PERIODS = [
  { value: '',       label: 'All Terms' },
  { value: 'term_1', label: 'Term 1' },
  { value: 'term_2', label: 'Term 2' },
  { value: 'term_3', label: 'Term 3' },
]

export default function LessonsDevPage() {
  const [subject, setSubject] = useState('math')
  const [level,   setLevel]   = useState('std_4')
  const [period,  setPeriod]  = useState('')

  const [activeQuestId,  setActiveQuestId]  = useState('')
  const [activeSession,  setActiveSession]  = useState('')
  const [pickedQuestId,  setPickedQuestId]  = useState('')

  const idle = (): TestResult => ({ status: 'idle' })
  const [results, setResults] = useState<Record<string, TestResult>>({
    catalogue:        idle(),
    teacherCatalogue: idle(),
    show:             idle(),
    questions:        idle(),
    start:            idle(),
    complete:         idle(),
    submitQuestions:  idle(),
  })

  function set(key: string, r: TestResult) {
    setResults((prev) => ({ ...prev, [key]: r }))
  }

  async function run(key: string, fn: () => Promise<TestResult>) {
    set(key, { status: 'running' })
    try {
      const r = await fn()
      set(key, r)
    } catch (e) {
      set(key, { status: 'fail', error: String(e) })
    }
  }

  async function get(url: string): Promise<unknown> {
    const res = await fetch(url)
    const data = await res.json()
    if (!res.ok) throw new Error(data.message ?? `HTTP ${res.status}`)
    return data
  }

  async function post(url: string, body: unknown): Promise<unknown> {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.message ?? `HTTP ${res.status}`)
    return data
  }

  // ── Test runners ─────────────────────────────────────────────────────────

  const runCatalogue = () => run('catalogue', async () => {
    const qs = new URLSearchParams({ subject })
    const url = `/api/lessons?${qs}`
    const data = await get(url) as { lessons?: unknown[] }
    const count = data?.lessons?.length ?? 0
    if (count === 0) return { status: 'fail' as const, request: url, response: data, error: 'lessons array is empty' }
    const first = (data.lessons ?? [])[0] as Record<string, unknown>
    if (first && first.quest_id && !pickedQuestId) setPickedQuestId(String(first.quest_id))
    return { status: 'pass' as const, request: url, response: { count, first_item: first } }
  })

  const runTeacherCatalogue = () => run('teacherCatalogue', async () => {
    const qs = new URLSearchParams({ level, subject })
    if (period) qs.set('period', period)
    const url = `/api/lessons/teacher/catalogue?${qs}`
    const data = await get(url) as { lessons?: unknown[] }
    const count = data?.lessons?.length ?? 0
    return {
      status: count > 0 ? 'pass' as const : 'fail' as const,
      request: url,
      response: { count },
      error: count === 0 ? 'lessons array is empty' : undefined,
    }
  })

  const runShow = () => run('show', async () => {
    const qid = pickedQuestId || activeQuestId
    if (!qid) return { status: 'fail' as const, error: 'No quest_id — run Catalogue first or set one below' }
    const url = `/api/lessons/${qid}`
    const data = await get(url)
    return { status: 'pass' as const, request: url, response: data }
  })

  const runQuestions = () => run('questions', async () => {
    const qid = pickedQuestId || activeQuestId
    if (!qid) return { status: 'fail' as const, error: 'No quest_id — run Catalogue first or set one below' }
    const url = `/api/lessons/${qid}/questions`
    const data = await get(url) as { questions?: unknown[] }
    const count = (data as { questions?: unknown[] })?.questions?.length ?? 0
    return {
      status: count > 0 ? 'pass' as const : 'fail' as const,
      request: url,
      response: { count, sample: (data as { questions?: unknown[] })?.questions?.[0] },
      error: count === 0 ? 'No questions returned' : undefined,
    }
  })

  const runStart = () => run('start', async () => {
    const qid = pickedQuestId || activeQuestId
    if (!qid) return { status: 'fail' as const, error: 'No quest_id — run Catalogue first' }
    const body = { quest_id: qid, source: 'direct' }
    const url = '/api/lessons/start'
    const data = await post(url, body) as { session_id?: string }
    const sid = data?.session_id
    if (sid) setActiveSession(String(sid))
    return {
      status: sid ? 'pass' as const : 'fail' as const,
      request: `POST ${url} ${JSON.stringify(body)}`,
      response: data,
      error: sid ? undefined : 'No session_id in response',
    }
  })

  const runSubmitQuestions = () => run('submitQuestions', async () => {
    const sid = activeSession
    const qid = pickedQuestId || activeQuestId
    if (!sid) return { status: 'fail' as const, error: 'No session_id — run Start first' }
    if (!qid) return { status: 'fail' as const, error: 'No quest_id' }
    const body = { session_id: sid, quest_id: qid, answers: { q1: 'A' } }
    const url = '/api/lessons/submit-questions'
    const data = await post(url, body)
    return { status: 'pass' as const, request: `POST ${url} ${JSON.stringify(body)}`, response: data }
  })

  const runComplete = () => run('complete', async () => {
    const sid = activeSession
    if (!sid) return { status: 'fail' as const, error: 'No session_id — run Start first' }
    const body = { session_id: sid }
    const url = '/api/lessons/complete'
    const data = await post(url, body)
    return { status: 'pass' as const, request: `POST ${url} ${JSON.stringify(body)}`, response: data }
  })

  const runAll = async () => {
    await runCatalogue()
    await runTeacherCatalogue()
    await runShow()
    await runQuestions()
    await runStart()
    await runSubmitQuestions()
    await runComplete()
  }

  return (
    <div className="max-w-sm mx-auto w-full px-4 py-6 flex flex-col gap-5">
      <div>
        <h1 className="text-2xl font-bold">Lessons Dev Console</h1>
        <p className="text-sm text-base-content/50">Test all /api/lessons/* proxy routes</p>
      </div>

      {/* Config */}
      <div className="bg-base-200 rounded-2xl p-4 flex flex-col gap-3">
        <p className="font-semibold text-sm">Config</p>
        <div className="grid grid-cols-2 gap-2">
          <select value={subject} onChange={(e) => setSubject(e.target.value)} className="select select-bordered select-sm w-full">
            {SUBJECTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          <select value={level} onChange={(e) => setLevel(e.target.value)} className="select select-bordered select-sm w-full">
            {LEVELS.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
          </select>
        </div>
        <select value={period} onChange={(e) => setPeriod(e.target.value)} className="select select-bordered select-sm w-full">
          {PERIODS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
        </select>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-base-content/50">Quest ID (auto-filled from catalogue)</label>
          <input
            type="text"
            value={pickedQuestId}
            onChange={(e) => setPickedQuestId(e.target.value)}
            placeholder="e.g. quest_math_001"
            className="input input-bordered input-sm w-full font-mono"
          />
        </div>
        {activeSession && (
          <p className="text-xs text-base-content/50 font-mono">Session: {activeSession}</p>
        )}
      </div>

      <button onClick={runAll} className="btn btn-neutral w-full">Run All Tests</button>

      {/* Tests */}
      <div className="flex flex-col gap-2">
        <p className="text-xs font-bold text-base-content/40 uppercase tracking-wider">Child Routes</p>
        <TestCard label="GET /api/lessons (catalogue)"          result={results.catalogue}       onRun={runCatalogue} />
        <TestCard label="GET /api/lessons/:quest_id (show)"    result={results.show}            onRun={runShow} />
        <TestCard label="GET /api/lessons/:quest_id/questions" result={results.questions}       onRun={runQuestions} />
        <TestCard label="POST /api/lessons/start"              result={results.start}           onRun={runStart} />
        <TestCard label="POST /api/lessons/submit-questions"   result={results.submitQuestions} onRun={runSubmitQuestions} />
        <TestCard label="POST /api/lessons/complete"           result={results.complete}        onRun={runComplete} />
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-xs font-bold text-base-content/40 uppercase tracking-wider">Teacher Routes</p>
        <TestCard label="GET /api/lessons/teacher/catalogue"   result={results.teacherCatalogue} onRun={runTeacherCatalogue} />
      </div>
    </div>
  )
}
