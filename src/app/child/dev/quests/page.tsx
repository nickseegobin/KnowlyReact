'use client'

import { useState } from 'react'

type Status = 'idle' | 'running' | 'pass' | 'fail' | 'skip'

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
  if (status === 'skip')    return <span className="badge badge-info badge-sm">Skipped</span>
  return <span className="badge badge-error badge-sm">Fail</span>
}

function TestCard({
  label,
  result,
  onRun,
  note,
}: {
  label: string
  result: TestResult
  onRun: () => void
  note?: string
}) {
  const [expanded, setExpanded] = useState(false)
  return (
    <div className="bg-base-200 rounded-xl p-3 flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex-1 min-w-0">
          <span className="text-sm font-medium">{label}</span>
          {note && <p className="text-xs text-base-content/40 mt-0.5">{note}</p>}
        </div>
        <div className="flex items-center gap-2 shrink-0">
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
      {result.status !== 'idle' && result.status !== 'skip' && (
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
          {result.error && <p className="text-error">{result.error}</p>}
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

export default function QuestsDevPage() {
  const [subject,  setSubject]  = useState('math')
  const [level,    setLevel]    = useState('std_4')
  const [period,   setPeriod]   = useState('')

  const [pickedQuestId, setPickedQuestId] = useState('')
  const [activeSession, setActiveSession] = useState('')

  const idle = (): TestResult => ({ status: 'idle' })
  const [results, setResults] = useState<Record<string, TestResult>>({
    catalogueAll:     idle(),
    catalogue:        idle(),
    show:             idle(),
    questions:        idle(),
    start:            idle(),
    submitQuestions:  idle(),
    complete:         idle(),
    teacherCatalogue: idle(),
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

  function pickFirst(data: unknown): string {
    const list = (data as { quests?: unknown[] })?.quests ?? (Array.isArray(data) ? data : [])
    const first = (list as Record<string, unknown>[])[0]
    return first?.quest_id ? String(first.quest_id) : ''
  }

  // ── Test runners ──────────────────────────────────────────────────────────

  const runCatalogueAll = () => run('catalogueAll', async () => {
    const url = `/api/quests`
    const data = await get(url) as { quests?: unknown[]; count?: number }
    const count = data?.count ?? data?.quests?.length ?? 0
    const qid = pickFirst(data)
    if (qid && !pickedQuestId) setPickedQuestId(qid)
    return {
      status: count > 0 ? 'pass' as const : 'fail' as const,
      request: url,
      response: { count, first_quest_id: qid || 'none' },
      error: count === 0 ? 'No approved quests found for this child\'s level/period. Check WP Admin → Quests.' : undefined,
    }
  })

  const runCatalogue = () => run('catalogue', async () => {
    const qs = new URLSearchParams({ subject })
    if (period) qs.set('period', period)
    const url = `/api/quests?${qs}`
    const data = await get(url) as { quests?: unknown[]; count?: number }
    const count = data?.count ?? data?.quests?.length ?? 0
    const qid = pickFirst(data)
    if (qid) setPickedQuestId(qid)
    return {
      status: count > 0 ? 'pass' as const : 'fail' as const,
      request: url,
      response: { count, first_quest_id: qid || 'none' },
      error: count === 0 ? `No approved quests for subject=${subject}. Try "All Subjects" or check WP Admin.` : undefined,
    }
  })

  const runShow = () => run('show', async () => {
    if (!pickedQuestId) return { status: 'fail' as const, error: 'No quest_id — run Catalogue first or set one below' }
    const url = `/api/quests/${pickedQuestId}`
    const data = await get(url)
    return { status: 'pass' as const, request: url, response: data }
  })

  const runQuestions = () => run('questions', async () => {
    if (!pickedQuestId) return { status: 'fail' as const, error: 'No quest_id — run Catalogue first' }
    const url = `/api/quests/${pickedQuestId}/questions`
    const data = await get(url) as { questions?: unknown[] }
    const count = data?.questions?.length ?? 0
    return {
      status: count > 0 ? 'pass' as const : 'fail' as const,
      request: url,
      response: { count, sample: data?.questions?.[0] },
      error: count === 0 ? 'No questions — quest may not have MCQs generated yet' : undefined,
    }
  })

  const runStart = () => run('start', async () => {
    if (!pickedQuestId) return { status: 'fail' as const, error: 'No quest_id — run Catalogue first' }
    const body = { quest_id: pickedQuestId, source: 'direct' }
    const url = '/api/quests/start'
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
    if (!activeSession) return { status: 'fail' as const, error: 'No session_id — run Start first' }
    if (!pickedQuestId) return { status: 'fail' as const, error: 'No quest_id' }
    const body = { session_id: activeSession, quest_id: pickedQuestId, answers: { q1: 'A' } }
    const url = '/api/quests/submit-questions'
    const data = await post(url, body)
    return { status: 'pass' as const, request: `POST ${url} ${JSON.stringify(body)}`, response: data }
  })

  const runComplete = () => run('complete', async () => {
    if (!activeSession) return { status: 'fail' as const, error: 'No session_id — run Start first' }
    const body = { session_id: activeSession }
    const url = '/api/quests/complete'
    const data = await post(url, body)
    return { status: 'pass' as const, request: `POST ${url} ${JSON.stringify(body)}`, response: data }
  })

  const runTeacherCatalogue = () => run('teacherCatalogue', async () => {
    const qs = new URLSearchParams({ level, subject })
    if (period) qs.set('period', period)
    const url = `/api/quests/teacher/catalogue?${qs}`
    const res = await fetch(url)
    const data = await res.json()
    // 403 "Teacher account required" in child context = route + auth work correctly
    if ((data?.message ?? '').toLowerCase().includes('teacher')) {
      return { status: 'pass' as const, request: url, response: data }
    }
    const list: unknown[] = data?.quests ?? (Array.isArray(data) ? data as unknown[] : [])
    const count = list.length
    return {
      status: count > 0 ? 'pass' as const : 'fail' as const,
      request: url,
      response: { count },
      error: count === 0 ? 'No quests — try from a teacher session' : undefined,
    }
  })

  const runAll = async () => {
    await runCatalogueAll()
    await runCatalogue()
    await runShow()
    await runQuestions()
    await runStart()
    await runSubmitQuestions()
    await runComplete()
    await runTeacherCatalogue()
  }

  return (
    <div className="max-w-sm mx-auto w-full px-4 py-6 flex flex-col gap-5">
      <div>
        <h1 className="text-2xl font-bold">Quests Dev Console</h1>
        <p className="text-sm text-base-content/50">Test all /api/quests/* proxy routes</p>
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
            placeholder="e.g. q-tt_primary-std_4-term_1-math-module_1"
            className="input input-bordered input-sm w-full font-mono"
          />
        </div>
        {activeSession && (
          <p className="text-xs text-base-content/50 font-mono">Session: {activeSession}</p>
        )}
      </div>

      <button onClick={runAll} className="btn btn-neutral w-full">Run All Tests</button>

      {/* Child Routes */}
      <div className="flex flex-col gap-2">
        <p className="text-xs font-bold text-base-content/40 uppercase tracking-wider">Child Routes</p>
        <TestCard
          label="GET /api/quests (all subjects)"
          result={results.catalogueAll}
          onRun={runCatalogueAll}
          note="Diagnosis: checks if ANY quests are approved in DB"
        />
        <TestCard
          label="GET /api/quests (filtered by subject)"
          result={results.catalogue}
          onRun={runCatalogue}
          note="Uses subject selector above"
        />
        <TestCard label="GET /api/quests/:quest_id (show)"       result={results.show}            onRun={runShow} />
        <TestCard label="GET /api/quests/:quest_id/questions"    result={results.questions}       onRun={runQuestions} />
        <TestCard label="POST /api/quests/start"                 result={results.start}           onRun={runStart} />
        <TestCard label="POST /api/quests/submit-questions"      result={results.submitQuestions} onRun={runSubmitQuestions} />
        <TestCard label="POST /api/quests/complete"              result={results.complete}        onRun={runComplete} />
      </div>

      {/* Teacher Routes */}
      <div className="flex flex-col gap-2">
        <p className="text-xs font-bold text-base-content/40 uppercase tracking-wider">Teacher Routes</p>
        <TestCard
          label="GET /api/quests/teacher/catalogue"
          result={results.teacherCatalogue}
          onRun={runTeacherCatalogue}
          note="Expects 'Teacher account required' in child context — confirms route + auth work"
        />
      </div>
    </div>
  )
}
