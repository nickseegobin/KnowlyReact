import { redirect } from 'next/navigation'
import { getTokenFromCookie } from '@/lib/cookies'
import { wpFetch } from '@/lib/wp-api'
import Breadcrumb from '@/components/child/Breadcrumb'
import Link from 'next/link'
import type { AuthUser } from '@/types/knowly'

interface Quest {
  quest_id: string | number
  title: string
  subject: string
  topic: string
  description?: string
  sections_count: number
  gem_cost: number
  completed?: boolean
  completion_count?: number
  badge_name?: string
}

// WP quests API uses short slugs; display names are used in URLs
const SUBJECT_SLUG: Record<string, string> = {
  'Mathematics': 'math',
  'English Language Arts': 'english',
  'Language Arts': 'english',
  'Science': 'science',
  'Social Studies': 'social_studies',
}

function levelLabel(level: string) {
  return level === 'std_4' ? 'Standard 4' : level === 'std_5' ? 'Standard 5' : level
}
function periodLabel(period: string) {
  const map: Record<string, string> = { term_1: 'Term 1', term_2: 'Term 2', term_3: 'Term 3' }
  return map[period] ?? period
}

export default async function QuestTopicPage({
  params,
}: {
  params: Promise<{ subject: string; topic: string }>
}) {
  const { subject: encodedSubject, topic: encodedTopic } = await params
  const subject = decodeURIComponent(encodedSubject)
  const topic = decodeURIComponent(encodedTopic)

  const token = await getTokenFromCookie()
  if (!token) redirect('/login')

  let quests: Quest[] = []
  let levelText = ''
  let fetchError = ''

  try {
    const user = await wpFetch<AuthUser>('/auth/me', 'GET', undefined, token)
    // levelText: only available when parent JWT is used (child JWT has no children array)
    const activeChild = user.children?.find((c) => c.child_id === user.active_child_id) ?? user.children?.[0]
    if (activeChild) {
      const level = activeChild.level
      const period = activeChild.period
      levelText = period ? `${levelLabel(level)} | ${periodLabel(period)}` : levelLabel(level)
    }

    // Quest fetch always runs — WP reads child's level/period from knowly_children table
    const subjectSlug = SUBJECT_SLUG[subject] ?? subject.toLowerCase().replace(/\s+/g, '_')
    const data = await wpFetch<{ quests: Quest[] } | Quest[]>(
      `/quests?subject=${encodeURIComponent(subjectSlug)}`,
      'GET', undefined, token
    )
    const raw = Array.isArray(data) ? data : (data as { quests: Quest[] }).quests ?? []
    quests = raw
  } catch (err) {
    fetchError = err instanceof Error ? err.message : String(err)
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href={`/child/quests/${encodedSubject}`}
          className="btn btn-circle btn-sm btn-ghost border border-base-300"
        >
          ‹
        </Link>
        <Breadcrumb crumbs={[
          { label: 'Home', href: '/child/home' },
          { label: 'Quests', href: '/child/quests' },
          { label: subject, href: `/child/quests/${encodedSubject}` },
          { label: topic },
        ]} />
      </div>

      {/* Title */}
      <div>
        <h1 className="text-3xl font-bold">{topic}</h1>
        <p className="text-base-content/60">{subject}{levelText ? ` · ${levelText}` : ''}</p>
      </div>

      {/* Quest cards */}
      {fetchError && (
        <div className="alert alert-error text-xs py-2 break-all">
          <span>Error: {fetchError}</span>
        </div>
      )}

      {quests.length === 0 && !fetchError ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <div className="text-5xl">📚</div>
          <p className="text-base-content/60 text-sm">No quests available for this topic yet.<br />Check back soon!</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {quests.map((quest) => (
            <Link
              key={quest.quest_id}
              href={`/child/quests/${encodedSubject}/${encodedTopic}/${quest.quest_id}`}
              className="relative flex items-center gap-4 p-4 rounded-2xl bg-base-200 hover:bg-base-300 transition-colors group overflow-hidden"
            >
              {/* Left accent bar */}
              <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl bg-gradient-to-b from-primary to-blue-500" />

              {/* Content */}
              <div className="flex-1 pl-2">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold text-base leading-snug">{quest.title}</p>
                  {quest.completed && (
                    <span className="shrink-0 badge badge-success badge-sm gap-1 mt-0.5">
                      ✓ Done
                    </span>
                  )}
                </div>
                {quest.description && (
                  <p className="text-xs text-base-content/50 mt-1 line-clamp-2">{quest.description}</p>
                )}
                <div className="flex items-center gap-3 mt-2">
                  <span className="flex items-center gap-1 text-xs text-base-content/50">
                    📚 {quest.sections_count ?? 0} section{(quest.sections_count ?? 0) !== 1 ? 's' : ''}
                  </span>
                  <span className="flex items-center gap-1 text-xs text-primary font-medium">
                    💎 {quest.gem_cost ?? 0} gem{(quest.gem_cost ?? 0) !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>

              <span className="text-base-content/30 text-lg group-hover:text-base-content/60 transition-colors">›</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
