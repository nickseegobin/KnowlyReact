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
  quest_id:      string
  module_title?: string
  topic?:        string
  subject:       string
  sort_order?:   number | null
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

  let allLessons: LessonEntry[] = []
  let fetchError: string | null = null

  try {
    const qs = new URLSearchParams()
    if (level)  qs.set('level', level)
    if (period) qs.set('period', period)
    const data = await wpFetch<{ lessons: LessonEntry[] }>(`/lessons?${qs}`, 'GET', undefined, token)
    allLessons = data?.lessons ?? []
  } catch (err) {
    fetchError = err instanceof Error ? err.message : 'Failed to load lessons'
  }

  const { subject: subjectParam = '' } = await searchParams
  const availableSubjects = subjectsFromLessons(allLessons)
  const selectedSubject = availableSubjects.includes(subjectParam as never)
    ? subjectParam
    : (availableSubjects[0] ?? '')

  const lessons = allLessons.filter((l) => l.subject === selectedSubject)

  // Group by module_title, preserving order
  const moduleGroups: Array<{ title: string; lessons: LessonEntry[] }> = []
  for (const lesson of lessons) {
    const key = lesson.module_title ?? 'Other'
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

      {fetchError && availableSubjects.length === 0 && (
        <div className="alert alert-error text-sm py-2">{fetchError}</div>
      )}

      {!fetchError && availableSubjects.length === 0 && (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <div className="text-5xl">📚</div>
          <p className="text-base-content/60 text-sm">No lessons available for your level yet.<br />Check back soon!</p>
        </div>
      )}

      {availableSubjects.length > 0 && (
        <>
          {/* Subject tabs */}
          <div className="flex gap-2 flex-wrap">
            {availableSubjects.map((subj) => (
              <Link
                key={subj}
                href={`/child/lessons?subject=${subj}`}
                className={`btn btn-sm rounded-full ${
                  subj === selectedSubject ? 'btn-info' : 'btn-ghost border border-base-300'
                }`}
              >
                {SUBJECT_SHORT[subj] ?? subj}
              </Link>
            ))}
          </div>

          {/* Subject banner */}
          {selectedSubject && (
            <div className="flex items-center gap-3">
              <p className="font-semibold text-base">{SUBJECT_DISPLAY[selectedSubject]}</p>
              <div className="flex-1 h-px bg-base-200" />
              <p className="text-xs text-base-content/40">{lessons.length} topic{lessons.length !== 1 ? 's' : ''}</p>
            </div>
          )}

          {/* Topic list — grouped by module, all topics freely accessible */}
          {moduleGroups.length > 0 && (
            <div className="flex flex-col gap-6">
              {moduleGroups.map(({ title: moduleTitle, lessons: groupLessons }) => (
                <div key={moduleTitle} className="flex flex-col gap-1">
                  <p className="text-xs font-bold text-base-content/40 uppercase tracking-wider px-1 mb-1">
                    {moduleTitle}
                  </p>
                  <div className="flex flex-col gap-2">
                    {groupLessons.map((lesson) => {
                      const topicLabel = lesson.topic ?? lesson.module_title ?? lesson.quest_id
                      const href = `/child/lessons/${lesson.quest_id}?topic=${encodeURIComponent(topicLabel)}`
                      return (
                        <Link key={lesson.quest_id} href={href} className="block">
                          <div className="flex items-center gap-3 px-4 py-3 rounded-2xl border bg-base-100 border-base-200 hover:bg-base-200 transition-colors">
                            <div className="w-2 h-2 rounded-full shrink-0 bg-info/40" />
                            <span className="flex-1 text-sm font-medium">{topicLabel}</span>
                            <span className="badge badge-sm badge-ghost">Study →</span>
                          </div>
                        </Link>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
