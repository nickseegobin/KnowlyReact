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

const LEVELS = [
  { label: 'Standard 4', value: 'std_4' },
  { label: 'Standard 5', value: 'std_5' },
]

const PERIODS = [
  { label: 'All Terms', value: '' },
  { label: 'Term 1',    value: 'term_1' },
  { label: 'Term 2',    value: 'term_2' },
  { label: 'Term 3',    value: 'term_3' },
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
  expectFields,
}: {
  title: string
  description: string
  request: string
  onRun: () => void
  result: Result
  destructive?: boolean
  disabled?: boolean
  disabledReason?: string
  expectFields?: string[]
}) {
  const missingFields = expectFields && result.status === 'pass'
    ? expectFields.filter(f => {
        const data = result.data as Record<string, unknown> | null
        return data == null || !(f in data) || data[f] === null || data[f] === undefined
      })
    : []

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
      {missingFields.length > 0 && (
        <p className="text-xs text-error">
          ✗ Response missing expected fields: <strong>{missingFields.join(', ')}</strong>
        </p>
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

export default function TeacherAssignTestPage() {
  const [classId, setClassId]       = useState('9')
  const [subject, setSubject]       = useState('Mathematics')
  const [subjectKey, setSubjectKey] = useState('math')
  const [level, setLevel]           = useState('std_4')
  const [period, setPeriod]         = useState('')
  const [difficulty, setDifficulty] = useState('easy')
  const [modules, setModules]       = useState<Module[]>([])
  const [lastTaskId, setLastTaskId] = useState<number | null>(null)

  const [results, setResults] = useState<Record<string, Result>>({
    moduleList:     empty(),
    listTasks:      empty(),
    createGeneral:  empty(),
    createSingle:   empty(),
    createMulti:    empty(),
    taskDetail:     empty(),
  })

  const set = useCallback((key: string, r: Result) => {
    setResults(prev => ({ ...prev, [key]: r }))
  }, [])
  const setRunning = useCallback((key: string) => {
    setResults(prev => ({ ...prev, [key]: { status: 'running' } }))
  }, [])

  // ── Test runners ────────────────────────────────────────────────────────────

  const testModuleList = useCallback(async () => {
    setRunning('moduleList')
    const qs = new URLSearchParams({ subject: subjectKey, level })
    if (period) qs.set('period', period)
    const r = await runFetch(() => fetch(`/api/exams/topics?${qs}`))
    set('moduleList', r)
    if (r.status === 'pass' && Array.isArray((r.data as { modules?: Module[] })?.modules)) {
      setModules((r.data as { modules: Module[] }).modules)
    }
  }, [set, setRunning, subjectKey, level, period])

  const testListTasks = useCallback(async () => {
    setRunning('listTasks')
    const r = await runFetch(() => fetch(`/api/classes/${classId}/tasks`))
    set('listTasks', r)
  }, [set, setRunning, classId])

  const createTask = useCallback(async (key: string, payload: Record<string, unknown>) => {
    setRunning(key)
    const r = await runFetch(() => fetch(`/api/classes/${classId}/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }))
    set(key, r)
    const id = (r.data as { task_id?: number })?.task_id
    if (r.status === 'pass' && id) setLastTaskId(id)
  }, [set, setRunning, classId])

  const testCreateGeneral = useCallback(() =>
    createTask('createGeneral', {
      title:          `General ${subject} Trial (${difficulty})`,
      type:           'trial',
      subject:        subjectKey,
      difficulty,
      scope:          'period',
      module_numbers: [],
    }),
  [createTask, subject, subjectKey, difficulty])

  const testCreateSingle = useCallback(() => {
    if (!modules[0]) return
    return createTask('createSingle', {
      title:          `${modules[0].module_title} Trial (${difficulty})`,
      type:           'trial',
      subject:        subjectKey,
      difficulty,
      scope:          'general_topic',
      module_numbers: [modules[0].module_number],
    })
  }, [createTask, modules, subjectKey, difficulty])

  const testCreateMulti = useCallback(() => {
    if (modules.length < 2) return
    const nums = modules.slice(0, 2).map(m => m.module_number)
    return createTask('createMulti', {
      title:          `Multi-Topic Trial — ${modules.slice(0, 2).map(m => m.module_title).join(' + ')} (${difficulty})`,
      type:           'trial',
      subject:        subjectKey,
      difficulty,
      scope:          'general_topic',
      module_numbers: nums,
    })
  }, [createTask, modules, subjectKey, difficulty])

  const testTaskDetail = useCallback(async () => {
    if (!lastTaskId) return
    setRunning('taskDetail')
    const r = await runFetch(() => fetch(`/api/classes/${classId}/tasks`))
    // Filter to the last created task so we can verify scope/module_numbers stored correctly
    if (r.status === 'pass') {
      const tasks = (r.data as { tasks?: unknown[] })?.tasks ?? (Array.isArray(r.data) ? r.data : [])
      const match = (tasks as Array<{ id: number }>).find(t => t.id === lastTaskId)
      set('taskDetail', { ...r, data: match ?? { error: `task_id ${lastTaskId} not found in response` } })
    } else {
      set('taskDetail', r)
    }
  }, [set, setRunning, classId, lastTaskId])

  const hasModules  = modules.length > 0
  const has2Modules = modules.length >= 2
  const m0 = modules[0]?.module_number
  const m01 = modules.slice(0, 2).map(m => m.module_number).join(', ')

  return (
    <div className="flex flex-col gap-6 pb-10 max-w-2xl mx-auto px-4 py-6">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">Teacher Assign — Test Console</h1>
          <p className="text-sm text-base-content/50">Validates the full teacher trial assignment API flow</p>
        </div>
        <span className="badge badge-warning badge-sm mt-1">DEV</span>
      </div>

      {/* Config */}
      <div className="rounded-xl bg-base-200 p-4 flex flex-col gap-3">
        <p className="font-semibold text-sm">Configuration</p>
        <div className="flex gap-3 flex-wrap">
          <label className="flex flex-col gap-1">
            <span className="text-xs text-base-content/50">Class ID</span>
            <input
              type="number"
              className="input input-sm input-bordered w-24"
              value={classId}
              onChange={e => setClassId(e.target.value)}
            />
          </label>
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
            <span className="text-xs text-base-content/50">Level</span>
            <select
              className="select select-sm select-bordered"
              value={level}
              onChange={e => { setLevel(e.target.value); setModules([]) }}
            >
              {LEVELS.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-base-content/50">Period</span>
            <select
              className="select select-sm select-bordered"
              value={period}
              onChange={e => { setPeriod(e.target.value); setModules([]) }}
            >
              {PERIODS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
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
        <div className="flex flex-wrap gap-2 text-xs">
          {lastTaskId && <span className="badge badge-success badge-outline badge-sm">Last task_id: {lastTaskId}</span>}
          {hasModules && <span className="badge badge-info badge-outline badge-sm">{modules.length} modules loaded</span>}
        </div>
      </div>

      {/* ── Preflight ── */}
      <section className="flex flex-col gap-3">
        <p className="text-xs font-bold text-base-content/40 uppercase tracking-wider">Preflight</p>
        <TestCard
          title="Module List"
          description={`Fetch curriculum modules for ${subject} — used to populate topic pills`}
          request={`GET /api/exams/topics?subject=${subjectKey}&level=${level}${period ? `&period=${period}` : ''}`}
          onRun={testModuleList}
          result={results.moduleList}
          expectFields={['modules']}
        />
        <TestCard
          title="List Class Tasks"
          description={`Fetch all tasks for class ${classId} — verify task shape includes scope and module_numbers`}
          request={`GET /api/classes/${classId}/tasks`}
          onRun={testListTasks}
          result={results.listTasks}
        />
      </section>

      {/* ── Create Tasks ── */}
      <section className="flex flex-col gap-3">
        <p className="text-xs font-bold text-base-content/40 uppercase tracking-wider">Create Trial Tasks</p>

        <TestCard
          title="Create — General Trial Task"
          description="scope=period, no module filter — full question bank"
          request={`POST /api/classes/${classId}/tasks\n{ type: "trial", subject: "${subjectKey}", difficulty: "${difficulty}", scope: "period", module_numbers: [] }`}
          onRun={testCreateGeneral}
          result={results.createGeneral}
          expectFields={['task_id']}
        />
        <TestCard
          title="Create — Single Topic Trial Task"
          description={`scope=general_topic, module_numbers: [${m0 ?? '?'}]`}
          request={`POST /api/classes/${classId}/tasks\n{ type: "trial", subject: "${subjectKey}", difficulty: "${difficulty}", scope: "general_topic", module_numbers: [${m0 ?? '?'}] }`}
          onRun={testCreateSingle}
          result={results.createSingle}
          disabled={!hasModules}
          disabledReason="Run Module List first"
          expectFields={['task_id']}
        />
        <TestCard
          title="Create — Multi-Topic Trial Task"
          description={`scope=general_topic, module_numbers: [${m01 || '?'}]`}
          request={`POST /api/classes/${classId}/tasks\n{ type: "trial", subject: "${subjectKey}", difficulty: "${difficulty}", scope: "general_topic", module_numbers: [${m01 || '?'}] }`}
          onRun={testCreateMulti}
          result={results.createMulti}
          disabled={!has2Modules}
          disabledReason="Run Module List first (need ≥2 modules)"
          expectFields={['task_id']}
        />
      </section>

      {/* ── Verify stored data ── */}
      <section className="flex flex-col gap-3">
        <p className="text-xs font-bold text-base-content/40 uppercase tracking-wider">Verify Stored Data</p>
        <TestCard
          title="Inspect Created Task"
          description={`Fetches task list and isolates task_id ${lastTaskId ?? '?'} — confirms scope and module_numbers are persisted`}
          request={`GET /api/classes/${classId}/tasks  → filter to id: ${lastTaskId ?? '?'}`}
          onRun={testTaskDetail}
          result={results.taskDetail}
          disabled={!lastTaskId}
          disabledReason="Create a task first"
          expectFields={['scope', 'module_numbers']}
        />
      </section>

      {/* ── What this tells us ── */}
      <section className="rounded-xl bg-base-200 p-4 flex flex-col gap-2 text-xs text-base-content/60">
        <p className="font-semibold text-sm text-base-content">What this validates</p>
        <ul className="list-disc pl-4 flex flex-col gap-1">
          <li><strong>Module List</strong> — WP /child/modules → Railway curriculum-topics returns data</li>
          <li><strong>Create tasks</strong> — WP accepts scope + module_numbers and stores them in the DB</li>
          <li><strong>Inspect task</strong> — scope and module_numbers survive the DB round-trip and appear in list responses</li>
          <li>If <strong>scope/module_numbers are missing</strong> from the inspected task, the DB columns need adding and WP Task Service needs updating</li>
          <li>No gem_reward is sent — if the task still requires it, the WP API needs updating</li>
        </ul>
      </section>

    </div>
  )
}
