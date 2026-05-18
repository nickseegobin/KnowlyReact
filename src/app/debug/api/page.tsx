/**
 * API Debug Page — /debug/api
 * Server component: runs wpFetch calls directly and shows raw responses.
 * DELETE THIS FILE before shipping to production.
 */

import { getTokenFromCookie } from '@/lib/cookies'
import { wpFetch } from '@/lib/wp-api'

const BASE = process.env.WP_API_BASE ?? '(WP_API_BASE not set)'

async function tryFetch(label: string, path: string, token: string): Promise<{
  label: string
  url: string
  ok: boolean
  data: unknown
  error?: string
}> {
  const url = `${BASE}${path}`
  try {
    const data = await wpFetch(path, 'GET', undefined, token)
    return { label, url, ok: true, data }
  } catch (err) {
    return { label, url, ok: false, data: null, error: String(err) }
  }
}

export default async function ApiDebugPage() {
  const token = await getTokenFromCookie()

  if (!token) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold text-error mb-2">Not authenticated</h1>
        <p className="text-sm text-base-content/60">Log in first, then revisit this page.</p>
      </div>
    )
  }

  // Step 1: get user info
  const meResult = await tryFetch('GET /auth/me', '/auth/me', token)
  const user = meResult.ok ? (meResult.data as Record<string, unknown>) : null
  const children = Array.isArray(user?.children) ? user.children as Record<string, unknown>[] : []
  const activeChild = children.find((c) => c.child_id === user?.active_child_id) ?? children[0]
  const level  = (activeChild?.level  as string) ?? ''
  const period = (activeChild?.period as string) ?? ''

  // Step 2: progression
  const progQs = new URLSearchParams({ level: level || 'std_4', curriculum: 'tt_primary' })
  if (period) progQs.set('period', period)
  const progResult = await tryFetch(
    `GET /child/progression`,
    `/child/progression?${progQs}`,
    token,
  )

  // Extract progression topics for math
  const progData = progResult.ok ? (progResult.data as Record<string, unknown>) : null
  const subjects = (progData?.subjects as Record<string, { topics: { topic: string }[] }>) ?? {}
  const mathTopics = subjects['math']?.topics?.map((t) => t.topic) ?? []

  // Step 3: fetch quest content for module_4 to inspect section_ids
  const mathQuestId = 'quest-tt_primary-std_4-term_1-math-module_4'
  const questContentResult = await tryFetch(
    `GET /quests/${mathQuestId}`,
    `/quests/${mathQuestId}`,
    token,
  )

  // Step 3b: simulate start → check session_id returned
  let startResult: { label: string; url: string; ok: boolean; data: unknown; error?: string } = {
    label: 'POST /quests/start (dry run — skipped)',
    url: '',
    ok: true,
    data: 'Not called — uncomment to test',
  }
  // Uncomment to actually test:
  // startResult = await (async () => {
  //   try {
  //     const res = await fetch(`${BASE}/quests/start`, {
  //       method: 'POST',
  //       headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  //       body: JSON.stringify({ quest_id: mathQuestId, source: 'direct' }),
  //     })
  //     return { label: 'POST /quests/start', url: `${BASE}/quests/start`, ok: res.ok, data: await res.json() }
  //   } catch (e) {
  //     return { label: 'POST /quests/start', url: `${BASE}/quests/start`, ok: false, data: null, error: String(e) }
  //   }
  // })()

  // Step 4: quest catalogue — same params as the quests page
  const subjects_to_test = ['math', 'english', 'science']
  const catalogueResults = await Promise.all(
    subjects_to_test.map((subj) => {
      const qs = new URLSearchParams({ subject: subj })
      if (level)  qs.set('level',  level)
      if (period) qs.set('period', period)
      return tryFetch(`GET /quests?subject=${subj}`, `/quests?${qs}`, token)
    })
  )

  // Step 4: show topic name match for math
  const mathCatalogueRaw = catalogueResults[0]
  const mathCatalogueData = mathCatalogueRaw.ok
    ? (mathCatalogueRaw.data as { quests?: { quest_id: string; topic: string }[] })
    : null
  const catalogueTopics = mathCatalogueData?.quests?.map((q) => ({ quest_id: q.quest_id, topic: q.topic })) ?? []

  const matchedTopics = mathTopics.map((t) => ({
    progressionTopic: t,
    match: catalogueTopics.find((c) => c.topic === t) ?? null,
  }))

  // Extract section_ids from quest content
  const questData = questContentResult.ok
    ? (questContentResult.data as { sections?: { section_id?: string; title?: string }[]; content?: { sections?: { section_id?: string; title?: string }[] } })
    : null
  const questSections = questData?.sections ?? questData?.content?.sections ?? []

  const results = [meResult, progResult, questContentResult, startResult, ...catalogueResults]

  return (
    <div className="p-6 flex flex-col gap-8 font-mono text-sm">
      <div>
        <h1 className="text-2xl font-bold font-sans mb-1">API Debug</h1>
        <p className="text-xs text-base-content/50 font-sans">
          WP_API_BASE = <span className="text-warning">{BASE}</span>
          {level && <> · level={level} period={period}</>}
        </p>
      </div>

      {/* Topic match table */}
      <section>
        <h2 className="text-lg font-bold font-sans mb-3">
          Topic Name Match (Math progression vs catalogue)
        </h2>
        {matchedTopics.length === 0 ? (
          <p className="text-error text-xs">No progression topics found — check auth/me and progression results below.</p>
        ) : (
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-base-200">
                <th className="text-left p-2 border border-base-300">Progression topic</th>
                <th className="text-left p-2 border border-base-300">Catalogue match</th>
                <th className="text-left p-2 border border-base-300">quest_id</th>
              </tr>
            </thead>
            <tbody>
              {matchedTopics.map(({ progressionTopic, match }) => (
                <tr key={progressionTopic} className={match ? '' : 'bg-error/10'}>
                  <td className="p-2 border border-base-300">{progressionTopic}</td>
                  <td className="p-2 border border-base-300">
                    {match ? (
                      <span className="text-success">✓ {match.topic}</span>
                    ) : (
                      <span className="text-error">✗ no match</span>
                    )}
                  </td>
                  <td className="p-2 border border-base-300 text-base-content/60">
                    {match?.quest_id ?? '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {catalogueTopics.length > 0 && (
          <details className="mt-3">
            <summary className="cursor-pointer text-xs text-base-content/50 hover:text-base-content">
              All catalogue topics ({catalogueTopics.length})
            </summary>
            <ul className="mt-2 flex flex-col gap-0.5 pl-4">
              {catalogueTopics.map((c) => (
                <li key={c.quest_id} className="text-xs">
                  <span className="text-base-content/50">{c.quest_id}</span> → {c.topic}
                </li>
              ))}
            </ul>
          </details>
        )}
      </section>

      {/* Section ID check — critical for section-complete calls */}
      <section>
        <h2 className="text-lg font-bold font-sans mb-3">
          Quest Section IDs (needed for section-complete API)
        </h2>
        <p className="text-xs text-base-content/50 mb-2 font-sans">
          Quest: <code>{mathQuestId}</code> — {questSections.length} sections found
        </p>
        {questSections.length === 0 ? (
          <p className="text-error text-xs">No sections in quest data — check raw quest response below.</p>
        ) : (
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-base-200">
                <th className="text-left p-2 border border-base-300">#</th>
                <th className="text-left p-2 border border-base-300">title</th>
                <th className="text-left p-2 border border-base-300">section_id</th>
              </tr>
            </thead>
            <tbody>
              {questSections.map((s, i) => (
                <tr key={i} className={s.section_id ? '' : 'bg-error/10'}>
                  <td className="p-2 border border-base-300">{i}</td>
                  <td className="p-2 border border-base-300">{s.title ?? '—'}</td>
                  <td className="p-2 border border-base-300">
                    {s.section_id
                      ? <span className="text-success">{s.section_id}</span>
                      : <span className="text-error font-bold">NULL — section-complete will be skipped!</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* Raw API responses */}
      <section className="flex flex-col gap-6">
        <h2 className="text-lg font-bold font-sans">Raw API Responses</h2>
        {results.map((r) => (
          <div key={r.label} className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className={`badge badge-sm ${r.ok ? 'badge-success' : 'badge-error'}`}>
                {r.ok ? '200 OK' : 'ERROR'}
              </span>
              <span className="font-bold">{r.label}</span>
            </div>
            <p className="text-xs text-base-content/40 break-all">{r.url}</p>
            {r.error && (
              <pre className="bg-error/10 text-error text-xs p-3 rounded-xl overflow-auto max-h-40">
                {r.error}
              </pre>
            )}
            <pre className="bg-base-200 text-xs p-3 rounded-xl overflow-auto max-h-96 whitespace-pre-wrap break-all">
              {JSON.stringify(r.data, null, 2)}
            </pre>
          </div>
        ))}
      </section>
    </div>
  )
}
