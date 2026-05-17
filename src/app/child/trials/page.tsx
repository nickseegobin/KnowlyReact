import { redirect } from 'next/navigation'
import { getTokenFromCookie } from '@/lib/cookies'
import { wpFetch } from '@/lib/wp-api'
import type { AuthUser } from '@/types/knowly'
import Link from 'next/link'
import { Leaf, Gauge, Flame, ChevronRight, ClipboardX, SlidersHorizontal } from 'lucide-react'
import {
  SUBJECT_DISPLAY,
  SUBJECT_SHORT,
  subjectsFromCatalogue,
} from '@/lib/subject-catalogue'

interface CatalogueEntry {
  subject:    string
  difficulty: string
  pool_count: number
}

const DIFFICULTIES = [
  {
    key:       'easy',
    label:     'Easy',
    desc:      'Foundational concepts · relaxed pace',
    Icon:      Leaf,
    iconClass: 'bg-success/10 text-success',
  },
  {
    key:       'medium',
    label:     'Medium',
    desc:      'Core curriculum · moderate pace',
    Icon:      Gauge,
    iconClass: 'bg-warning/10 text-warning',
  },
  {
    key:       'hard',
    label:     'Hard',
    desc:      'Full exam conditions · time pressure',
    Icon:      Flame,
    iconClass: 'bg-error/10 text-error',
  },
] as const

function levelLabel(level: string) {
  return level === 'std_4' ? 'Standard 4' : level === 'std_5' ? 'Standard 5' : level
}
function periodLabel(period: string) {
  const map: Record<string, string> = { term_1: 'Term 1', term_2: 'Term 2', term_3: 'Term 3' }
  return map[period] ?? period
}

export default async function TrialsPage({
  searchParams,
}: {
  searchParams: Promise<{ subject?: string }>
}) {
  const token = await getTokenFromCookie()
  if (!token) redirect('/login')

  // 1. Get active child info (level + period needed for accurate pool counts)
  let level     = ''
  let period    = ''
  let levelText = ''

  try {
    const user = await wpFetch<AuthUser>('/auth/me', 'GET', undefined, token)
    const activeChild = user.children?.find((c) => c.child_id === user.active_child_id) ?? user.children?.[0]
    if (activeChild) {
      level     = activeChild.level  ?? ''
      period    = activeChild.period ?? ''
      levelText = period
        ? `${levelLabel(level)} · ${periodLabel(period)}`
        : levelLabel(level)
    }
  } catch { /* continue without level filter */ }

  // 2. Fetch catalogue filtered by child's level + period — one call covers everything
  let catalogue: CatalogueEntry[] = []
  try {
    const qs = new URLSearchParams()
    if (level)  qs.set('level', level)
    if (period) qs.set('period', period)
    const data = await wpFetch<{ catalogue: CatalogueEntry[] }>(
      `/exams${qs.toString() ? `?${qs}` : ''}`,
      'GET', undefined, token
    )
    catalogue = data?.catalogue ?? []
  } catch { /* fall through — show all subjects as fallback */ }

  // Only surface subjects that actually have questions seeded (pool_count > 0).
  // Falls back to all subjects when the API fails entirely (catalogue is empty).
  const filteredSubjects = subjectsFromCatalogue(catalogue)
  const availableSubjectCodes = filteredSubjects.length > 0 ? filteredSubjects : ['math', 'english', 'science', 'social_studies'] as const

  const { subject: subjectParam = '' } = await searchParams
  const selectedSubject    = availableSubjectCodes.includes(subjectParam as never) ? subjectParam : (availableSubjectCodes[0] ?? 'math')
  const displayName        = SUBJECT_DISPLAY[selectedSubject]
  const encodedDisplayName = encodeURIComponent(displayName)

  // Pool counts for the selected subject — only difficulties with pool_count > 0
  const subjectCatalogue = catalogue.filter(
    (e) => e.subject === displayName && e.pool_count > 0
  )
  const availableDifficulties = new Set(subjectCatalogue.map((e) => e.difficulty))
  const poolByDifficulty: Record<string, number> = {}
  for (const entry of subjectCatalogue) {
    poolByDifficulty[entry.difficulty] = entry.pool_count
  }

  // When API succeeded but this subject has nothing yet, show empty state
  const catalogueFetched    = catalogue.length > 0
  const noTrialsForSubject  = catalogueFetched && subjectCatalogue.length === 0

  const displayDifficulties = DIFFICULTIES.filter((d) => {
    // If we have real catalogue data, hide difficulties with no questions.
    // If catalogue failed, show all 3 as a fallback.
    return !catalogueFetched || availableDifficulties.has(d.key)
  })

  return (
    <div className="flex flex-col gap-4">

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Trials</h1>
        {levelText && (
          <div className="flex items-center gap-2 mt-0.5">
            <p className="text-base-content/60 text-sm">{levelText}</p>
            <Link
              href="/child/settings/content"
              className="flex items-center gap-1 text-xs text-primary/60 hover:text-primary transition-colors font-medium"
            >
              <SlidersHorizontal size={11} />
              Change
            </Link>
          </div>
        )}
      </div>

      {/* Subject tabs — only subjects with questions */}
      <div className="flex gap-2 flex-wrap">
        {availableSubjectCodes.map((subj) => (
          <Link
            key={subj}
            href={`/child/trials?subject=${subj}`}
            className={`btn btn-sm rounded-full ${
              subj === selectedSubject ? 'btn-primary' : 'btn-ghost border border-base-300'
            }`}
          >
            {SUBJECT_SHORT[subj]}
          </Link>
        ))}
      </div>

      {/* Selected subject banner */}
      <div className="flex items-center gap-3">
        <p className="font-semibold text-base">{SUBJECT_DISPLAY[selectedSubject]}</p>
        <div className="flex-1 h-px bg-base-200" />
      </div>

      {/* Difficulty cards — or empty state */}
      {noTrialsForSubject ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <div className="w-14 h-14 rounded-2xl bg-base-200 flex items-center justify-center">
            <ClipboardX size={28} className="text-base-content/30" />
          </div>
          <div>
            <p className="font-semibold text-base-content/70">No trials available yet</p>
            <p className="text-sm text-base-content/40 mt-1">
              {SUBJECT_SHORT[selectedSubject]} trials are coming soon. Check back later!
            </p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {displayDifficulties.map(({ key, label, desc, Icon, iconClass }) => {
            const poolCount = poolByDifficulty[key] ?? null
            return (
              <Link
                key={key}
                href={`/child/trials/${encodedDisplayName}/${key}`}
                className="flex items-center gap-4 p-4 rounded-2xl bg-base-200 hover:bg-base-300 transition-colors group"
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${iconClass}`}>
                  <Icon size={24} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold">{label}</p>
                    {poolCount !== null && (
                      <span className="text-xs text-base-content/40">{poolCount} questions</span>
                    )}
                  </div>
                  <p className="text-sm text-base-content/60 mt-0.5">{desc}</p>
                </div>
                <ChevronRight size={18} className="text-base-content/30 group-hover:text-base-content/60 transition-colors shrink-0" />
              </Link>
            )
          })}
        </div>
      )}

    </div>
  )
}
