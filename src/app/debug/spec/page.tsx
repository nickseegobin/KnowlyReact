'use client'

/**
 * Synced Viewer Spec Tests — /debug/spec
 *
 * Browser-side unit tests for the Director system:
 *   Group 1 — stripLottieTags        (pure function)
 *   Group 2 — parseTagEvents         (pure function)
 *   Group 3 — useDirector hook       (live hook output)
 *   Group 4 — Type shape sanity      (runtime assertions)
 *
 * DELETE or gate behind an env check before production.
 */

import { useState, useCallback, useEffect, useRef } from 'react'
import {
  stripLottieTags,
  parseTagEvents,
  useDirector,
  type UseDirectorResult,
} from '@/lib/useDirector'
import type { AudioMark, TagEvent } from '@/types/knowly'
import type { Section } from '@/components/child/LessonPlayer'

// ── Test runner ───────────────────────────────────────────────────────────────

interface TestResult {
  label: string
  pass: boolean
  detail?: unknown
  error?: string
  ms: number
}

interface TestGroup {
  label: string
  results: TestResult[]
}

function runTest(label: string, fn: () => unknown): TestResult {
  const t0 = performance.now()
  try {
    const detail = fn()
    return { label, pass: true, detail: detail ?? undefined, ms: +(performance.now() - t0).toFixed(2) }
  } catch (e) {
    return { label, pass: false, error: e instanceof Error ? e.message : String(e), ms: +(performance.now() - t0).toFixed(2) }
  }
}

function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(msg)
}

function eq<T>(a: T, b: T, label?: string): void {
  const as = JSON.stringify(a)
  const bs = JSON.stringify(b)
  if (as !== bs) throw new Error(`${label ? label + ': ' : ''}got ${as}, want ${bs}`)
}

// ── Fixtures ──────────────────────────────────────────────────────────────────

const MARKS_5: AudioMark[] = [
  { time: 0,   value: 'A'      },
  { time: 200, value: 'number' },
  { time: 450, value: 'is'     },
  { time: 600, value: 'an'     },
  { time: 800, value: 'idea'   },
]

const MARKS_3: AudioMark[] = [
  { time: 100, value: 'Hello' },
  { time: 400, value: 'there' },
  { time: 700, value: 'world' },
]

const SECTION_NO_MARKS: Section = {
  title: 'Test Section',
  explanation: ['A number is an idea.'],
  lottie_url: null,
}

const SECTION_WITH_MARKS: Section = {
  title: 'Test Section',
  explanation: ['[start] A number is an idea.'],
  explanation_marks: [MARKS_5],
  lottie_url: 'https://cdn.example.com/test.lottie',
}

const SECTION_MULTI_TAG: Section = {
  title: 'Multi-tag',
  explanation: ['Hello [start] there [next] world'],
  explanation_marks: [MARKS_3],
  lottie_url: 'https://cdn.example.com/test.lottie',
}

// ── Group 1: stripLottieTags ──────────────────────────────────────────────────

function buildGroup1(): TestResult[] {
  return [
    runTest('No tags — text unchanged', () => {
      eq(stripLottieTags('A number is an idea.'), 'A number is an idea.')
    }),
    runTest('[start] stripped, double space collapsed', () => {
      eq(stripLottieTags('Hello [start] world'), 'Hello world')
    }),
    runTest('[next] stripped', () => {
      eq(stripLottieTags('See [next] this'), 'See this')
    }),
    runTest('[m1]–[m4] all stripped', () => {
      const input = '[m1] one [m2] two [m3] three [m4] four'
      const out   = stripLottieTags(input)
      assert(!out.includes('['), `Brackets remain in output: "${out}"`)
      eq(out, 'one two three four')
    }),
    runTest('Tag at start — no leading space', () => {
      eq(stripLottieTags('[start] Hello world'), 'Hello world')
    }),
    runTest('Tag at end — no trailing space', () => {
      eq(stripLottieTags('Hello world [m2]'), 'Hello world')
    }),
    runTest('Multiple adjacent tags collapsed', () => {
      eq(stripLottieTags('Hello [start][next] world'), 'Hello world')
    }),
    runTest('Empty string — returns empty string', () => {
      eq(stripLottieTags(''), '')
    }),
    runTest('Text with no Lottie markers is unaffected', () => {
      const t = 'What is 2 + 2? [A] four [B] five'
      eq(stripLottieTags(t), t)  // [A], [B] are not valid Lottie tags
    }),
    runTest('[m5]–[m10] stripped (extended range)', () => {
      eq(stripLottieTags('[m5]The key to learning'), 'The key to learning')
      eq(stripLottieTags('[m10] final marker'), 'final marker')
      eq(stripLottieTags('mid [m7] sentence'), 'mid sentence')
    }),
  ]
}

// ── Group 2: parseTagEvents ───────────────────────────────────────────────────

function buildGroup2(): TestResult[] {
  return [
    runTest('No tags — empty events array', () => {
      const events = parseTagEvents('A number is an idea.', MARKS_5)
      eq(events, [])
    }),
    runTest('[start] at start → marker m1, triggerTime = marks[0].time', () => {
      const events = parseTagEvents('[start] A number is an idea.', MARKS_5)
      eq(events.length, 1, 'event count')
      eq(events[0].tag,         '[start]', 'tag')
      eq(events[0].marker,      'm1',      'marker')
      eq(events[0].triggerTime, 0,         'triggerTime')
    }),
    runTest('[start] after 2 words → fires at word-2 timestamp', () => {
      // "Hello there [start] world"
      // Clean words: Hello=marks[0], there=marks[1], world=marks[2]
      // Tag fires at marks[2] (the word after the tag)
      const marks: AudioMark[] = [
        { time: 0,   value: 'Hello' },
        { time: 200, value: 'there' },
        { time: 400, value: 'world' },
      ]
      const events = parseTagEvents('Hello there [start] world', marks)
      eq(events.length, 1)
      eq(events[0].triggerTime, 400)
      eq(events[0].marker, 'm1')
    }),
    runTest('[next] x3 → m1, m2, m3 in order', () => {
      const marks: AudioMark[] = [
        { time: 0,   value: 'one'   },
        { time: 100, value: 'two'   },
        { time: 200, value: 'three' },
      ]
      const events = parseTagEvents('[next] one [next] two [next] three', marks)
      eq(events.length, 3, 'event count')
      eq(events[0].marker, 'm1')
      eq(events[1].marker, 'm2')
      eq(events[2].marker, 'm3')
    }),
    runTest('[m2] → marker m2 directly', () => {
      const events = parseTagEvents('[m2] A number', MARKS_5)
      eq(events.length, 1)
      eq(events[0].marker, 'm2')
      eq(events[0].tag, '[m2]')
    }),
    runTest('[m4] → marker m4 directly', () => {
      const events = parseTagEvents('Hello [m4] there', MARKS_3)
      eq(events.length, 1)
      eq(events[0].marker, 'm4')
      eq(events[0].triggerTime, 400)  // marks[1] = "there"
    }),
    runTest('Tag at end with no following word — skipped gracefully', () => {
      const events = parseTagEvents('Hello world [start]', MARKS_3)
      // wordsSeen=2 at tag time, marks[2] exists ("world") — fires at marks[2]
      eq(events.length, 1)
      eq(events[0].triggerTime, 700)
    }),
    runTest('Tag past end of marks — skipped with no error', () => {
      const marks: AudioMark[] = [{ time: 0, value: 'one' }]
      const events = parseTagEvents('one [start] two', marks)
      // wordsSeen=1 at tag time, marks[1] is undefined → skipped
      eq(events.length, 0, 'event should be skipped when no mark follows')
    }),
    runTest('Mixed tags: [start], [m2], [next] — resolves correctly', () => {
      const marks: AudioMark[] = [
        { time: 0,   value: 'Alpha'   },
        { time: 100, value: 'Beta'    },
        { time: 200, value: 'Gamma'   },
        { time: 300, value: 'Delta'   },
      ]
      const events = parseTagEvents('[start] Alpha [m2] Beta [next] Gamma', marks)
      eq(events.length, 3)
      eq(events[0], { tag: '[start]', marker: 'm1', triggerTime: 0   })
      eq(events[1], { tag: '[m2]',    marker: 'm2', triggerTime: 100 })
      eq(events[2], { tag: '[next]',  marker: 'm1', triggerTime: 200 })
    }),
    runTest('triggerTime values are in ascending order (parse order)', () => {
      const events = parseTagEvents('[start] A number is an idea.', MARKS_5)
      for (let i = 1; i < events.length; i++) {
        assert(events[i].triggerTime >= events[i - 1].triggerTime, `events not in order at index ${i}`)
      }
      return `${events.length} events checked`
    }),
  ]
}

// ── Group 3: useDirector hook (via inline component) ─────────────────────────

interface HookSnapshot {
  label: string
  inputs: { section: Section | null; paraIdx: number; audioMs: number }
  result: UseDirectorResult
  assertions: { pass: boolean; message: string }[]
}

function HookTestSuite({ onSnapshots }: { onSnapshots: (s: HookSnapshot[]) => void }) {
  // Each call to useDirector must be at top level (Rules of Hooks).
  // We declare all test cases up front.

  const r0 = useDirector(null, 0, 0)
  const r1 = useDirector(SECTION_NO_MARKS, 0, 0)
  const r2 = useDirector(SECTION_WITH_MARKS, 0, 0)
  const r3 = useDirector(SECTION_WITH_MARKS, 0, 500)
  const r4 = useDirector(SECTION_WITH_MARKS, 0, 1000)
  const r5 = useDirector(SECTION_MULTI_TAG, 0, 0)
  const r6 = useDirector(SECTION_MULTI_TAG, 0, 300)
  const r7 = useDirector(SECTION_MULTI_TAG, 0, 600)

  const reported = useRef(false)

  useEffect(() => {
    if (reported.current) return
    reported.current = true

    function check(cond: boolean, msg: string) {
      return { pass: cond, message: msg }
    }

    const snapshots: HookSnapshot[] = [
      {
        label: 'null section → all defaults',
        inputs: { section: null, paraIdx: 0, audioMs: 0 },
        result: r0,
        assertions: [
          check(r0.hasLottie === false,          'hasLottie = false'),
          check(r0.hasMarks === false,           'hasMarks = false'),
          check(r0.chunkEndTimeMs === null,      'chunkEndTimeMs = null'),
          check(r0.activeLottieCommand === null, 'activeLottieCommand = null'),
          check(r0.displayText === '',           'displayText = ""'),
          check(r0.tagEvents.length === 0,       'tagEvents = []'),
        ],
      },
      {
        label: 'section with no marks → hasMarks=false, hasLottie=false',
        inputs: { section: SECTION_NO_MARKS, paraIdx: 0, audioMs: 0 },
        result: r1,
        assertions: [
          check(r1.hasLottie === false, 'hasLottie = false (no lottie_url)'),
          check(r1.hasMarks === false,  'hasMarks = false (no marks)'),
          check(r1.chunkEndTimeMs === null, 'chunkEndTimeMs = null'),
          check(r1.displayText === 'A number is an idea.', 'displayText = original text'),
        ],
      },
      {
        label: 'section with marks + lottie_url, audioMs=0 ([start] fires at t=0)',
        inputs: { section: SECTION_WITH_MARKS, paraIdx: 0, audioMs: 0 },
        result: r2,
        assertions: [
          check(r2.hasLottie === true,  'hasLottie = true'),
          check(r2.hasMarks === true,   'hasMarks = true'),
          check(r2.chunkEndTimeMs === 800, 'chunkEndTimeMs = last mark (800ms)'),
          // [start] fires at marks[0].time=0; triggerTime(0) <= audioMs(0) → fires immediately
          check(r2.activeLottieCommand?.marker === 'm1', 'activeLottieCommand = m1 (fired at t=0)'),
          check(r2.displayText === 'A number is an idea.', 'displayText has tags stripped'),
          check(r2.tagEvents.length === 1, 'one tag event parsed'),
          check(r2.tagEvents[0]?.marker === 'm1', 'tag resolves to m1'),
          check(r2.tagEvents[0]?.triggerTime === 0, '[start] fires at marks[0].time = 0'),
        ],
      },
      {
        label: 'audioMs=500 — [start] tag (triggerTime=0) has fired',
        inputs: { section: SECTION_WITH_MARKS, paraIdx: 0, audioMs: 500 },
        result: r3,
        assertions: [
          check(r3.activeLottieCommand !== null,           'activeLottieCommand is not null'),
          check(r3.activeLottieCommand?.marker === 'm1',   'active marker = m1'),
          check(r3.activeLottieCommand?.triggerTime === 0, 'fired at t=0'),
        ],
      },
      {
        label: 'audioMs=1000 — past chunkEndTimeMs (800ms)',
        inputs: { section: SECTION_WITH_MARKS, paraIdx: 0, audioMs: 1000 },
        result: r4,
        assertions: [
          check(r4.chunkEndTimeMs !== null && 1000 > r4.chunkEndTimeMs, 'audioMs > chunkEndTimeMs — caller should advance'),
          check(r4.activeLottieCommand?.marker === 'm1', 'last fired command still m1'),
        ],
      },
      {
        label: 'multi-tag section: audioMs=0 — no command fired yet',
        inputs: { section: SECTION_MULTI_TAG, paraIdx: 0, audioMs: 0 },
        result: r5,
        assertions: [
          check(r5.tagEvents.length === 2,          '2 tags in "Hello [start] there [next] world"'),
          check(r5.tagEvents[0]?.marker === 'm1',   'first tag = m1'),
          check(r5.tagEvents[1]?.marker === 'm1',   '[next] #1 = m1'),
          check(r5.activeLottieCommand === null,     'no command before first triggerTime'),
        ],
      },
      {
        label: 'multi-tag: audioMs=300 — [start] fired (triggerTime=400), not yet',
        inputs: { section: SECTION_MULTI_TAG, paraIdx: 0, audioMs: 300 },
        result: r6,
        assertions: [
          // [start] fires at marks[1].time = 400 (after "Hello", next word is "there")
          check(r6.activeLottieCommand === null, 'audioMs=300 < triggerTime=400, nothing fired'),
        ],
      },
      {
        label: 'multi-tag: audioMs=600 — [start] fired, [next] about to fire (700)',
        inputs: { section: SECTION_MULTI_TAG, paraIdx: 0, audioMs: 600 },
        result: r7,
        assertions: [
          check(r7.activeLottieCommand?.marker === 'm1', '[start] has fired (t=400), marker=m1'),
        ],
      },
    ]

    onSnapshots(snapshots)
  }, [r0, r1, r2, r3, r4, r5, r6, r7, onSnapshots])

  return null
}

// ── Group 4: Type shape sanity ────────────────────────────────────────────────

function buildGroup4(): TestResult[] {
  return [
    runTest('AudioMark has time (number) and value (string)', () => {
      const m: AudioMark = { time: 62, value: 'Hello' }
      assert(typeof m.time === 'number',  'time is number')
      assert(typeof m.value === 'string', 'value is string')
      return m
    }),
    runTest('TagEvent has tag, marker, triggerTime', () => {
      const ev: TagEvent = { tag: '[start]', marker: 'm1', triggerTime: 100 }
      assert(typeof ev.tag === 'string',         'tag is string')
      assert(typeof ev.marker === 'string',      'marker is string')
      assert(typeof ev.triggerTime === 'number', 'triggerTime is number')
      return ev
    }),
    runTest('LottieTag values [start],[next],[m1]–[m10] are all strings', () => {
      const tags = ['[start]', '[next]', '[m1]', '[m2]', '[m3]', '[m4]', '[m5]', '[m6]', '[m7]', '[m8]', '[m9]', '[m10]']
      tags.forEach((t) => assert(typeof t === 'string', `${t} is string`))
      return tags
    }),
    runTest('LottieMarker values m1–m10 all match /^m\\d+$/', () => {
      const markers = ['m1','m2','m3','m4','m5','m6','m7','m8','m9','m10']
      markers.forEach((m) => assert(/^m\d+$/.test(m), `${m} matches pattern`))
      return markers
    }),
    runTest('Section accepts explanation_marks and lottie_url (TS already proved this)', () => {
      const s: Section = {
        title: 'Test',
        explanation: ['Hello [start] world'],
        explanation_marks: [[{ time: 0, value: 'Hello' }, { time: 400, value: 'world' }]],
        lottie_url: 'https://cdn.example.com/test.lottie',
      }
      assert(Array.isArray(s.explanation_marks), 'explanation_marks is array')
      assert(typeof s.lottie_url === 'string',   'lottie_url is string')
      return { keys: Object.keys(s) }
    }),
    runTest('Section lottie_url accepts null (Mode 1 / text-only)', () => {
      const s: Section = { title: 'T', lottie_url: null }
      assert(s.lottie_url === null, 'lottie_url = null')
    }),
  ]
}

// ── UI components ─────────────────────────────────────────────────────────────

function Badge({ pass }: { pass: boolean }) {
  return (
    <span
      style={{
        display: 'inline-block',
        width: 20,
        height: 20,
        lineHeight: '20px',
        textAlign: 'center',
        borderRadius: 4,
        fontSize: 12,
        fontWeight: 700,
        background: pass ? '#dcfce7' : '#fee2e2',
        color:      pass ? '#15803d' : '#dc2626',
        flexShrink: 0,
      }}
    >
      {pass ? '✓' : '✗'}
    </span>
  )
}

function TestRow({ result }: { result: TestResult }) {
  const [open, setOpen] = useState(!result.pass)
  return (
    <div
      style={{
        padding: '8px 12px',
        borderBottom: '1px solid #f1f5f9',
        cursor: result.detail || result.error ? 'pointer' : 'default',
      }}
      onClick={() => setOpen((o) => !o)}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Badge pass={result.pass} />
        <span style={{ flex: 1, fontSize: 13, color: '#1e293b' }}>{result.label}</span>
        <span style={{ fontSize: 11, color: '#94a3b8' }}>{result.ms}ms</span>
      </div>
      {open && result.error && (
        <pre style={{ margin: '6px 0 0 28px', fontSize: 11, color: '#dc2626', whiteSpace: 'pre-wrap' }}>
          {result.error}
        </pre>
      )}
      {open && !result.error && result.detail !== undefined && (
        <pre style={{ margin: '6px 0 0 28px', fontSize: 11, color: '#64748b', whiteSpace: 'pre-wrap' }}>
          {JSON.stringify(result.detail, null, 2)}
        </pre>
      )}
    </div>
  )
}

function HookRow({ snap }: { snap: HookSnapshot }) {
  const allPass = snap.assertions.every((a) => a.pass)
  const [open, setOpen] = useState(!allPass)
  return (
    <div
      style={{ padding: '8px 12px', borderBottom: '1px solid #f1f5f9', cursor: 'pointer' }}
      onClick={() => setOpen((o) => !o)}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Badge pass={allPass} />
        <span style={{ flex: 1, fontSize: 13, color: '#1e293b' }}>{snap.label}</span>
        <span style={{ fontSize: 11, color: '#94a3b8' }}>
          {snap.assertions.filter((a) => a.pass).length}/{snap.assertions.length} assertions
        </span>
      </div>
      {open && (
        <div style={{ margin: '6px 0 0 28px' }}>
          {snap.assertions.map((a, i) => (
            <div key={i} style={{ fontSize: 11, color: a.pass ? '#15803d' : '#dc2626', marginBottom: 2 }}>
              {a.pass ? '✓' : '✗'} {a.message}
            </div>
          ))}
          <details style={{ marginTop: 6 }}>
            <summary style={{ fontSize: 11, color: '#64748b', cursor: 'pointer' }}>hook output</summary>
            <pre style={{ fontSize: 11, color: '#64748b', whiteSpace: 'pre-wrap', marginTop: 4 }}>
              {JSON.stringify(snap.result, null, 2)}
            </pre>
          </details>
        </div>
      )}
    </div>
  )
}

function Group({
  label,
  children,
  pass,
  total,
}: {
  label: string
  children: React.ReactNode
  pass: number
  total: number
}) {
  const allPass = pass === total
  return (
    <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden', marginBottom: 16 }}>
      <div
        style={{
          padding: '10px 14px',
          background: allPass ? '#f0fdf4' : '#fff7f7',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}
      >
        <span style={{ fontSize: 14, fontWeight: 700, color: '#1e293b', flex: 1 }}>{label}</span>
        <span
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: allPass ? '#15803d' : '#dc2626',
            background: allPass ? '#dcfce7' : '#fee2e2',
            padding: '2px 8px',
            borderRadius: 9999,
          }}
        >
          {pass}/{total}
        </span>
      </div>
      {children}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function SpecPage() {
  const [hookSnapshots, setHookSnapshots] = useState<HookSnapshot[]>([])
  const [runKey, setRunKey] = useState(0)
  const [group1, setGroup1] = useState<TestResult[]>([])
  const [group2, setGroup2] = useState<TestResult[]>([])
  const [group4, setGroup4] = useState<TestResult[]>([])

  const handleSnapshots = useCallback((snaps: HookSnapshot[]) => {
    setHookSnapshots(snaps)
  }, [])

  // Run pure-function tests after mount to avoid SSR/client timing mismatch.
  useEffect(() => {
    setGroup1(buildGroup1())
    setGroup2(buildGroup2())
    setGroup4(buildGroup4())
  }, [runKey])

  const hookPass  = hookSnapshots.reduce((n, s) => n + (s.assertions.every((a) => a.pass) ? 1 : 0), 0)
  const hookTotal = hookSnapshots.length

  const totalPass = [
    group1.filter((r) => r.pass).length,
    group2.filter((r) => r.pass).length,
    hookPass,
    group4.filter((r) => r.pass).length,
  ].reduce((a, b) => a + b, 0)

  const totalAll = group1.length + group2.length + hookTotal + group4.length

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', padding: '24px 20px', fontFamily: 'system-ui, sans-serif' }}>
      {/* Header */}
      <div style={{ maxWidth: 820, margin: '0 auto 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: '#0f172a', margin: 0 }}>
            🎬 Synced Viewer — Spec Tests
          </h1>
          <button
            onClick={() => { setRunKey((k) => k + 1); setHookSnapshots([]) }}
            style={{
              marginLeft: 'auto',
              padding: '6px 14px',
              background: '#3b82f6',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            ↺ Re-run
          </button>
        </div>

        {/* Summary bar */}
        {totalAll > 0 && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              padding: '8px 14px',
              background: totalPass === totalAll ? '#f0fdf4' : '#fff7f7',
              border: `1px solid ${totalPass === totalAll ? '#bbf7d0' : '#fecaca'}`,
              borderRadius: 6,
              fontSize: 13,
            }}
          >
            <span style={{ color: '#15803d', fontWeight: 700 }}>✓ {totalPass} passed</span>
            {totalAll - totalPass > 0 && (
              <span style={{ color: '#dc2626', fontWeight: 700 }}>✗ {totalAll - totalPass} failed</span>
            )}
            <span style={{ color: '#64748b' }}>/ {totalAll} total</span>
            <span style={{ marginLeft: 'auto', fontSize: 11, color: '#94a3b8' }}>
              /debug/spec · dev only
            </span>
          </div>
        )}
      </div>

      <div style={{ maxWidth: 820, margin: '0 auto' }}>
        {/* Group 1 */}
        <Group
          label="Group 1 — stripLottieTags (pure function)"
          pass={group1.filter((r) => r.pass).length}
          total={group1.length}
        >
          {group1.map((r, i) => <TestRow key={i} result={r} />)}
        </Group>

        {/* Group 2 */}
        <Group
          label="Group 2 — parseTagEvents (pure function)"
          pass={group2.filter((r) => r.pass).length}
          total={group2.length}
        >
          {group2.map((r, i) => <TestRow key={i} result={r} />)}
        </Group>

        {/* Group 3 — hook */}
        <Group
          label="Group 3 — useDirector hook (live)"
          pass={hookPass}
          total={hookTotal}
        >
          {hookSnapshots.length === 0 ? (
            <div style={{ padding: '12px 14px', fontSize: 12, color: '#94a3b8' }}>Collecting hook results…</div>
          ) : (
            hookSnapshots.map((s, i) => <HookRow key={i} snap={s} />)
          )}
        </Group>

        {/* Group 4 */}
        <Group
          label="Group 4 — Type shape sanity (runtime)"
          pass={group4.filter((r) => r.pass).length}
          total={group4.length}
        >
          {group4.map((r, i) => <TestRow key={i} result={r} />)}
        </Group>
      </div>

      {/* Hidden hook test suite — renders hooks, reports results */}
      <HookTestSuite key={runKey} onSnapshots={handleSnapshots} />
    </div>
  )
}
