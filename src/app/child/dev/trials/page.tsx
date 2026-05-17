'use client'

import { useState, useCallback } from 'react'

// ── Types ─────────────────────────────────────────────────────────────────────

interface Result {
  status: 'idle' | 'running' | 'pass' | 'fail'
  code?: number
  data?: unknown
  ms?: number
}

interface Module {
  module_number: number
  module_title: string
}

// ── Constants ─────────────────────────────────────────────────────────────────

const SUBJECTS = [
  { label: 'Mathematics',           key: 'math' },
  { label: 'English Language Arts', key: 'english' },
  { label: 'Science',               key: 'science' },
  { label: 'Social Studies',        key: 'social_studies' },
]

const DIFFICULTIES = ['easy', 'medium', 'hard']

// ── Helpers ───────────────────────────────────────────────────────────────────

function empty(): Result { return { status: 'idle' } }

async function runFetch(fn: () => Promise<Response>): Promise<Result> {
  const t0 = Date.now()
  try {
    const res = await fn()
    let data: unknown
    try { data = await res.json() } catch { data = null }
    return { status: res.ok ? 'pass' : 'fail', code: res.status, data, ms: Date.now() - t0 }
  } catch (e) {
    return { status: 'fail', data: { error: String(e) }, ms: Date.now() - t0 }
  }
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StatusBadge({ status, code }: { status: Result['status']; code?: number }) {
  if (status === 'idle')    return <span className="badge badge-ghost badge-sm">Idle</span>
  if (status === 'running') return <span className="badge badge-warning badge-sm animate-pulse">Running…</span>
  if (status === 'pass')    return <span className="badge badge-success badge-sm">✓ {code}</span>
  return <span className="badge badge-error badge-sm">✗ {code ?? 'Error'}</span>
}

function ResultPanel({ result }: { result: Result }) {
  if (result.status === 'idle' || result.status === 'running') return null
  return (
    <div className="mt-2 flex flex-col gap-1">
      <div className="flex gap-2 items-center">
        <span className="text-xs text-base-content/40">{result.ms}ms</span>
        <button
          className="btn btn-xs btn-ghost"
          onClick={() => navigator.clipboard.writeText(JSON.stringify(result.data, null, 2))}
        >
          Copy JSON
        </button>
      </div>
      <pre className="text-xs bg-base-300 rounded-lg p-3 overflow-auto max-h-72 whitespace-pre-wrap break-all leading-relaxed">
        {JSON.stringify(result.data, null, 2)}
      </pre>
    </div>
  )
}

function TestCard({
  title,
  description,
  request,
  onRun,
  result,
  destructive = false,
  disabled = false,
  disabledReason,
}: {
  title: string
  description: string
  request: string
  onRun: () => void
  result: Result
  destructive?: boolean
  disabled?: boolean
  disabledReason?: string
}) {
  return (
    <div className={`rounded-xl bg-base-200 p-4 flex flex-col gap-2 ${destructive ? 'border border-error/40' : ''}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <p className="font-semibold text-sm">{title}</p>
          <p className="text-xs text-base-content/50">{description}</p>
        </div>
        <StatusBadge status={result.status} code={result.code} />
      </div>
      <code className="text-xs bg-base-300 rounded px-2 py-1.5 text-base-content/60 whitespace-pre-wrap">{request}</code>
      {disabled && disabledReason && (
        <p className="text-xs text-warning/80">⚠ {disabledReason}</p>
      )}
      <button
        onClick={onRun}
        disabled={result.status === 'running' || disabled}
        className={`btn btn-sm w-full ${destructive ? 'btn-error btn-outline' : 'btn-primary btn-outline'}`}
      >
        {result.status === 'running' ? 'Running…' : 'Run'}
      </button>
      <ResultPanel result={result} />
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function TrialTestPage() {
  const [subject, setSubject]       = useState('Mathematics')
  const [subjectKey, setSubjectKey] = useState('math')
  const [difficulty, setDifficulty] = useState('easy')
  const [modules, setModules]       = useState<Module[]>([])
  const [sessionId, setSessionId]   = useState<string | number | null>(null)

  const [results, setResults] = useState<Record<string, Result>>({
    gemCosts:      empty(),
    moduleList:    empty(),
    activeSession: empty(),
    startGeneral:  empty(),
    startSingle:   empty(),
    startMulti:    empty(),
    resume:        empty(),
    checkpoint:    empty(),
    submit:        empty(),
    cancel:        empty(),
  })

  const set = useCallback((key: string, r: Result) => {
    setResults(prev => ({ ...prev, [key]: r }))
  }, [])

  const setRunning = useCallback((key: string) => {
    setResults(prev => ({ ...prev, [key]: { status: 'running' } }))
  }, [])

  // ── Test runners ────────────────────────────────────────────────────────────

  const testGemCosts = useCallback(async () => {
    setRunning('gemCosts')
    set('gemCosts', await runFetch(() => fetch('/api/gems/costs')))
  }, [set, setRunning])

  const testModuleList = useCallback(async () => {
    setRunning('moduleList')
    const r = await runFetch(() => fetch(`/api/exams/topics?subject=${encodeURIComponent(subjectKey)}`))
    set('moduleList', r)
    if (r.status === 'pass' && Array.isArray((r.data as { modules?: Module[] })?.modules)) {
      setModules((r.data as { modules: Module[] }).modules)
    }
  }, [set, setRunning, subjectKey])

  const testActiveSession = useCallback(async () => {
    setRunning('activeSession')
    const r = await runFetch(() => fetch('/api/exams/active'))
    set('activeSession', r)
    const sid = (r.data as { session?: { session_id?: string | number } })?.session?.session_id
    if (r.status === 'pass' && sid != null) setSessionId(sid)
  }, [set, setRunning])

  const startTrial = useCallback(async (key: string, moduleNumbers: number[]) => {
    setRunning(key)
    const scope = moduleNumbers.length === 0 ? 'period' : 'general_topic'
    const r = await runFetch(() => fetch('/api/exams/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subject, difficulty, scope, module_numbers: moduleNumbers }),
    }))
    set(key, r)
    const sid = (r.data as { session_id?: string | number })?.session_id
    if (r.status === 'pass' && sid != null) setSessionId(sid)
  }, [set, setRunning, subject, difficulty])

  const testCheckpoint = useCallback(async () => {
    if (!sessionId) { set('checkpoint', { status: 'fail', data: { error: 'No active session — start a trial first' } }); return }
    setRunning('checkpoint')
    set('checkpoint', await runFetch(() => fetch(`/api/exams/${sessionId}/checkpoint`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ state: { currentIdx: 2, answers: { q1: 'A', q2: 'B' }, timings: { q1: 45, q2: 30 } } }),
    })))
  }, [set, setRunning, sessionId])

  const testResume = useCallback(async () => {
    if (!sessionId) { set('resume', { status: 'fail', data: { error: 'No active session — start a trial first' } }); return }
    setRunning('resume')
    set('resume', await runFetch(() => fetch(`/api/exams/${sessionId}/resume`, { method: 'POST' })))
  }, [set, setRunning, sessionId])

  const testSubmit = useCallback(async () => {
    if (!sessionId) { set('submit', { status: 'fail', data: { error: 'No active session — start a trial first' } }); return }
    setRunning('submit')
    const r = await runFetch(() => fetch(`/api/exams/${sessionId}/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answers: [] }),
    }))
    set('submit', r)
    if (r.status === 'pass') setSessionId(null)
  }, [set, setRunning, sessionId])

  const testCancel = useCallback(async () => {
    if (!sessionId) { set('cancel', { status: 'fail', data: { error: 'No active session — start a trial first' } }); return }
    setRunning('cancel')
    const r = await runFetch(() => fetch(`/api/exams/${sessionId}/cancel`, { method: 'POST' }))
    set('cancel', r)
    if (r.status === 'pass') setSessionId(null)
  }, [set, setRunning, sessionId])

  const runPreflight = useCallback(async () => {
    await testGemCosts()
    await testModuleList()
    await testActiveSession()
  }, [testGemCosts, testModuleList, testActiveSession])

  // ── Derived ─────────────────────────────────────────────────────────────────

  const hasSession  = sessionId !== null
  const hasModules  = modules.length > 0
  const has2Modules = modules.length >= 2
  const m0 = modules[0]?.module_number
  const m01 = modules.slice(0, 2).map(m => m.module_number).join(', ')

  return (
    <div className="flex flex-col gap-6 pb-10 max-w-2xl mx-auto">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">Trial Test Console</h1>
          <p className="text-sm text-base-content/50">Dev tool — validates trial API flows end-to-end</p>
        </div>
        <span className="badge badge-warning badge-sm mt-1">DEV</span>
      </div>

      {/* Config */}
      <div className="rounded-xl bg-base-200 p-4 flex flex-col gap-3">
        <p className="font-semibold text-sm">Configuration</p>
        <div className="flex gap-3 flex-wrap">
          <label className="flex flex-col gap-1">
            <span className="text-xs text-base-content/50">Subject</span>
            <select
              className="select select-sm select-bordered"
              value={subject}
              onChange={e => {
                const s = SUBJECTS.find(s => s.label === e.target.value)!
                setSubject(s.label)
                setSubjectKey(s.key)
                setModules([])
              }}
            >
              {SUBJECTS.map(s => <option key={s.key}>{s.label}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-base-content/50">Difficulty</span>
            <select
              className="select select-sm select-bordered"
              value={difficulty}
              onChange={e => setDifficulty(e.target.value)}
            >
              {DIFFICULTIES.map(d => <option key={d}>{d}</option>)}
            </select>
          </label>
        </div>

        {/* Active state indicators */}
        <div className="flex flex-wrap gap-2 text-xs">
          {sessionId != null
            ? <span className="badge badge-success badge-outline badge-sm">Session active: {sessionId}</span>
            : <span className="badge badge-ghost badge-sm">No active session</span>
          }
          {hasModules && (
            <span className="badge badge-info badge-outline badge-sm">{modules.length} modules: {modules.map(m => m.module_title).join(', ')}</span>
          )}
        </div>
      </div>

      {/* ── Preflight ── */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold text-base-content/40 uppercase tracking-wider">Preflight</p>
          <button className="btn btn-xs btn-outline" onClick={runPreflight}>Run All Preflight</button>
        </div>

        <TestCard
          title="Gem Costs"
          description="Fetch the gem cost schedule for all trial difficulties"
          request="GET /api/gems/costs"
          onRun={testGemCosts}
          result={results.gemCosts}
        />
        <TestCard
          title="Module List"
          description={`Fetch available curriculum modules for ${subject}`}
          request={`GET /api/exams/topics?subject=${subjectKey}`}
          onRun={testModuleList}
          result={results.moduleList}
        />
        <TestCard
          title="Active Session Check"
          description="Check if the child has an unfinished trial in progress"
          request="GET /api/exams/active"
          onRun={testActiveSession}
          result={results.activeSession}
        />
      </section>

      {/* ── Start Trial ── */}
      <section className="flex flex-col gap-3">
        <p className="text-xs font-bold text-base-content/40 uppercase tracking-wider">Start Trial</p>

        <TestCard
          title="Start — General Trial"
          description="scope=period — draws from the full question bank, no topic filter"
          request={`POST /api/exams/start\n{ subject: "${subject}", difficulty: "${difficulty}", scope: "period", module_numbers: [] }`}
          onRun={() => startTrial('startGeneral', [])}
          result={results.startGeneral}
        />
        <TestCard
          title="Start — Single Topic Trial"
          description={`scope=general_topic — module_numbers: [${m0 ?? '?'}] (first module from list)`}
          request={`POST /api/exams/start\n{ subject: "${subject}", difficulty: "${difficulty}", scope: "general_topic", module_numbers: [${m0 ?? '?'}] }`}
          onRun={() => startTrial('startSingle', m0 != null ? [m0] : [])}
          result={results.startSingle}
          disabled={!hasModules}
          disabledReason="Run Module List first"
        />
        <TestCard
          title="Start — Multi-Topic Trial"
          description={`scope=general_topic — module_numbers: [${m01 || '?'}] (first two modules)`}
          request={`POST /api/exams/start\n{ subject: "${subject}", difficulty: "${difficulty}", scope: "general_topic", module_numbers: [${m01 || '?'}] }`}
          onRun={() => startTrial('startMulti', modules.slice(0, 2).map(m => m.module_number))}
          result={results.startMulti}
          disabled={!has2Modules}
          disabledReason="Run Module List first (need ≥2 modules)"
        />
      </section>

      {/* ── In-Session ── */}
      <section className="flex flex-col gap-3">
        <p className="text-xs font-bold text-base-content/40 uppercase tracking-wider">In-Session</p>

        <TestCard
          title="Resume Session"
          description="Resume an in-progress session and get its checkpoint state"
          request={`POST /api/exams/${sessionId ?? '{session_id}'}/resume`}
          onRun={testResume}
          result={results.resume}
          disabled={!hasSession}
          disabledReason="Start a trial first"
        />
        <TestCard
          title="Save Checkpoint"
          description="Persist mid-exam progress (currentIdx=2, two dummy answers)"
          request={`POST /api/exams/${sessionId ?? '{session_id}'}/checkpoint\n{ state: { currentIdx: 2, answers: {…}, timings: {…} } }`}
          onRun={testCheckpoint}
          result={results.checkpoint}
          disabled={!hasSession}
          disabledReason="Start a trial first"
        />
        <TestCard
          title="Submit Trial"
          description="Submit with empty answers (all skipped) — completes and scores the session, clears session ID"
          request={`POST /api/exams/${sessionId ?? '{session_id}'}/submit\n{ answers: [] }`}
          onRun={testSubmit}
          result={results.submit}
          destructive
          disabled={!hasSession}
          disabledReason="Start a trial first"
        />
        <TestCard
          title="Cancel Trial"
          description="Abandon the active session without scoring — clears session ID"
          request={`POST /api/exams/${sessionId ?? '{session_id}'}/cancel`}
          onRun={testCancel}
          result={results.cancel}
          destructive
          disabled={!hasSession}
          disabledReason="Start a trial first"
        />
      </section>

    </div>
  )
}
