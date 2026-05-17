import { redirect } from 'next/navigation'
import { getTokenFromCookie } from '@/lib/cookies'
import { wpFetch } from '@/lib/wp-api'
import type { AuthUser } from '@/types/knowly'
import Link from 'next/link'
import { SlidersHorizontal } from 'lucide-react'
import {
  SUBJECT_DISPLAY,
  SUBJECT_SHORT,
  subjectsFromLessons,
} from '@/lib/subject-catalogue'

interface LessonEntry {
  quest_id:       string
  module_title?:  string
  topic?:         string
  subject:        string
  sort_order?:    number | null
}

function levelLabel(level: string) {
  return level === 'std_4' ? 'Standard 4' : level === 'std_5' ? 'Standard 5' : level
}

function periodLabel(period: string) {
  const map: Record<string, string> = { term_1: 'Term 1', term_2: 'Term 2', term_3: 'Term 3' }
  return map[period] ?? period
}

export default async function LessonsPage({
  searchParams,
}: {
  searchParams: Promise<{ subject?: string }>
}) {
  const token = await getTokenFromCookie()
  if (!token) redirect('/login')

  let level = ''
  let period = ''
  let levelText = ''

  try {
    const user = await wpFetch<AuthUser>('/auth/me', 'GET', undefined, token)
    const activeChild = user.children?.find((c) => c.child_id === user.active_child_id) ?? user.children?.[0]
    if (activeChild) {
      level     = activeChild.level ?? ''
      period    = activeChild.period ?? ''
      levelText = period
        ? `${levelLabel(level)} · ${periodLabel(period)}`
        : levelLabel(level)
    }
  } catch {}

  // Fetch all lessons (no subject filter) so we can discover which subjects
  // have content and dynamically build the tab list.
  let allLessons: LessonEntry[] = []
  let fetchError: string | null = null

  try {
    const qs = new URLSearchParams()
    if (level)  qs.set('level', level)
    if (period) qs.set('period', period)

    const data = await wpFetch<{ lessons: LessonEntry[] }>(
      `/lessons?${qs}`, 'GET', undefined, token
    )
    allLessons = data?.lessons ?? []
  } catch (err) {
    fetchError = err instanceof Error ? err.message : 'Failed to load lessons'
  }

  const availableSubjects = subjectsFromLessons(allLessons)

  const { subject: subjectParam = '' } = await searchParams
  const selectedSubject = availableSubjects.includes(subjectParam as never)
    ? subjectParam
    : (availableSubjects[0] ?? '')

  const subjectLabel   = selectedSubject ? SUBJECT_DISPLAY[selectedSubject] : ''
  const encodedSubject = encodeURIComponent(subjectLabel)

  const lessons = allLessons.filter((l) => l.subject === selectedSubject)

  // Group by module_title, preserving API order
  const moduleGroups: Array<{ title: string; lessons: LessonEntry[] }> = []
  for (const lesson of lessons) {
    const key = lesson.module_title ?? lesson.topic ?? 'Other'
    const existing = moduleGroups.find((g) => g.title === key)
    if (existing) existing.lessons.push(lesson)
    else moduleGroups.push({ title: key, lessons: [lesson] })
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Lessons</h1>
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

      {availableSubjects.length === 0 && !fetchError && (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <div className="text-5xl">📚</div>
          <p className="text-base-content/60 text-sm">
            No lessons available for your level yet.<br />Check back soon!
          </p>
        </div>
      )}

      {fetchError && availableSubjects.length === 0 && (
        <div className="alert alert-error text-sm py-2">{fetchError}</div>
      )}

      {availableSubjects.length > 0 && (
        <>
          {/* Subject tabs — only subjects with actual lessons */}
          <div className="flex gap-2 flex-wrap">
            {availableSubjects.map((subj) => (
              <Link
                key={subj}
                href={`/child/lessons?subject=${subj}`}
                className={`btn btn-sm rounded-full ${
                  subj === selectedSubject ? 'btn-primary' : 'btn-ghost border border-base-300'
                }`}
              >
                {SUBJECT_SHORT[subj]}
              </Link>
            ))}
          </div>

          {/* Selected subject banner */}
          {subjectLabel && (
            <div className="flex items-center gap-3">
              <p className="font-semibold text-base">{subjectLabel}</p>
              <div className="flex-1 h-px bg-base-200" />
            </div>
          )}

          {/* Topic list */}
          {lessons.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <div className="text-5xl">📚</div>
              {fetchError ? (
                <p className="text-error text-sm">{fetchError}</p>
              ) : (
                <p className="text-base-content/60 text-sm">
                  No lessons available for {subjectLabel} yet.<br />Check back soon!
                </p>
              )}
            </div>
          ) : (() => {
            let globalIdx = 0
            return (
              <div className="relative flex flex-col gap-0">
                {/* Vertical connector line */}
                <div className="absolute left-[19px] top-10 bottom-10 w-0.5 bg-base-300 z-0 pointer-events-none" />

                {moduleGroups.map(({ title: moduleTitle, lessons: groupLessons }, groupIdx) => {
                  const showHeader =
                    groupLessons.length > 1 ||
                    (groupLessons[0].module_title != null &&
                     groupLessons[0].module_title !== groupLessons[0].topic)

                  return (
                    <div key={moduleTitle} className={groupIdx > 0 ? 'mt-4' : ''}>
                      {showHeader && (
                        <p className="text-xs font-bold text-base-content/40 uppercase tracking-wider pl-14 pr-2 mb-2">
                          {moduleTitle}
                        </p>
                      )}
                      <div className="flex flex-col gap-2">
                        {groupLessons.map((lesson) => {
                          const nodeNum    = ++globalIdx
                          const topicLabel = lesson.topic ?? lesson.module_title ?? lesson.quest_id
                          const href       = `/child/lessons/${encodedSubject}/${encodeURIComponent(topicLabel)}/${lesson.quest_id}`

                          return (
                            <Link
                              key={lesson.quest_id}
                              href={href}
                              className={`relative z-10 flex items-center gap-3 p-3 rounded-2xl border bg-base-200 border-base-300 hover:bg-base-300 transition-colors group ${showHeader ? 'ml-6' : ''}`}
                            >
                              <div className="w-9 h-9 rounded-full bg-base-300 flex items-center justify-center text-xs font-bold shrink-0">
                                {nodeNum}
                              </div>
                              <p className="font-semibold text-sm flex-1 leading-tight">{topicLabel}</p>
                              <span className="text-base-content/30 text-lg group-hover:text-base-content/60 transition-colors shrink-0">›</span>
                            </Link>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          })()}
        </>
      )}
    </div>
  )
}
