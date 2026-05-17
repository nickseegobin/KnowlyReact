import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Compass, BookOpen, ClipboardCheck, Users, Trophy, TrendingUp, Award, Gem } from 'lucide-react'
import { getTokenFromCookie } from '@/lib/cookies'
import { wpFetch } from '@/lib/wp-api'
import type { AuthUser } from '@/types/knowly'

interface ProgressionTopic {
  topic: string
  avg_score: number | null
  status: 'not_started' | 'in_progress' | 'weak' | 'mastered'
}

interface ProgressionData {
  subjects: Record<string, { topics: ProgressionTopic[] }>
}

interface ChildAnalytics {
  weekly_trials: number
}

const SUBJECT_LABEL: Record<string, string> = {
  math:           'Mathematics',
  english:        'English Language Arts',
  science:        'Science',
  social_studies: 'Social Studies',
}

function timeGreeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

export default async function ChildHomePage() {
  const token = await getTokenFromCookie()
  if (!token) redirect('/login')

  let user: AuthUser | null = null
  try {
    user = await wpFetch<AuthUser>('/auth/me', 'GET', undefined, token)
  } catch { /* degrade gracefully */ }

  const activeChild = user?.children?.find((c) => c.child_id === user?.active_child_id) ?? user?.children?.[0]
  const displayName = activeChild?.display_name ?? user?.display_name ?? ''
  const nickname    = activeChild?.nickname ?? ''
  const level       = activeChild?.level ?? ''
  const period      = activeChild?.period ?? ''

  const progressionQs = new URLSearchParams({ level, curriculum: 'tt_primary' })
  if (period) progressionQs.set('period', period)

  const [analyticsResult, gemsResult, progressionResult] = await Promise.allSettled([
    wpFetch<ChildAnalytics>('/analytics/child-self?period=week', 'GET', undefined, token),
    wpFetch<{ balance: number }>('/gems/balance', 'GET', undefined, token),
    level
      ? wpFetch<ProgressionData>(`/child/progression?${progressionQs}`, 'GET', undefined, token)
      : Promise.reject('no level'),
  ])

  const weeklyTrials = analyticsResult.status === 'fulfilled' ? (analyticsResult.value?.weekly_trials ?? 0) : 0
  const gems         = gemsResult.status === 'fulfilled'      ? (gemsResult.value?.balance ?? 0)            : 0
  const progression  = progressionResult.status === 'fulfilled' ? progressionResult.value : null

  // Find first in-progress topic across subjects
  let continueSubject = ''
  let continueTopic   = ''
  let continueScore: number | null = null

  if (progression?.subjects) {
    for (const [subject, subj] of Object.entries(progression.subjects)) {
      const hit = subj.topics.find((t) => t.status === 'in_progress')
      if (hit) { continueSubject = subject; continueTopic = hit.topic; continueScore = hit.avg_score; break }
    }
  }

  const questHref = continueSubject ? `/child/quests/${continueSubject}` : '/child/quests'

  return (
    <div className="flex flex-col gap-5 py-2 max-w-2xl mx-auto">

      {/* ── Greeting ── */}
      <div className="flex flex-col gap-2">
        <div>
          <p className="text-sm text-base-content/50">{timeGreeting()},</p>
          <h1 className="text-2xl font-bold">{displayName || 'Explorer'}!</h1>
          {nickname && <p className="text-xs text-base-content/40 mt-0.5">@{nickname}</p>}
        </div>
        <div className="flex gap-2 flex-wrap">
          <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-base-200 text-sm font-medium">
            <Gem size={13} className="text-info" />
            {gems}
          </span>
          <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-base-200 text-sm font-medium">
            <TrendingUp size={13} className="text-success" />
            {weeklyTrials} {weeklyTrials === 1 ? 'trial' : 'trials'} this week
          </span>
        </div>
      </div>

      {/* ── Continue Quest CTA ── */}
      <Link
        href={questHref}
        className="rounded-2xl bg-primary text-primary-content p-5 flex flex-col gap-3 hover:opacity-90 transition-opacity"
      >
        <div className="flex flex-col gap-1">
          {continueTopic ? (
            <>
              <p className="text-xs font-medium uppercase tracking-wide text-primary-content/60">
                Continue Quest · {SUBJECT_LABEL[continueSubject] ?? continueSubject}
              </p>
              <p className="font-semibold text-lg leading-snug">{continueTopic}</p>
            </>
          ) : (
            <>
              <p className="text-xs font-medium uppercase tracking-wide text-primary-content/60">Quest Path</p>
              <p className="font-semibold text-lg">Ready to learn?</p>
              <p className="text-sm text-primary-content/70">Pick up your next topic and earn gems.</p>
            </>
          )}
        </div>

        {continueTopic && (
          <div className="w-full bg-primary-content/20 rounded-full h-1.5">
            <div
              className="bg-primary-content rounded-full h-1.5"
              style={{ width: `${Math.min(100, Math.round(continueScore ?? 40))}%` }}
            />
          </div>
        )}

        <span className="self-start px-4 py-2 rounded-xl bg-primary-content text-primary text-sm font-semibold">
          {continueTopic ? 'Continue →' : 'Start a Quest →'}
        </span>
      </Link>

      {/* ── Study grid ── */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-base-content/40 mb-2">Study</p>
        <div className="grid grid-cols-2 gap-3">
          {([
            { label: 'Quests',  desc: 'Follow your curriculum path',      Icon: Compass,        color: 'bg-primary/10 text-primary',  href: '/child/quests' },
            { label: 'Lessons', desc: 'Study any topic at your own pace', Icon: BookOpen,       color: 'bg-info/10 text-info',        href: '/child/lessons' },
            { label: 'Trials',  desc: 'Practice exams — earn gems',       Icon: ClipboardCheck, color: 'bg-warning/10 text-warning',  href: '/child/trials' },
            { label: 'Classes', desc: 'Tasks assigned by your teacher',   Icon: Users,          color: 'bg-success/10 text-success',  href: '/child/classes' },
          ] as const).map(({ label, desc, Icon, color, href }) => (
            <Link
              key={label}
              href={href}
              className="rounded-2xl bg-base-200 hover:bg-base-300 p-5 flex flex-col gap-2 transition-colors"
            >
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${color}`}>
                <Icon size={22} />
              </div>
              <div>
                <p className="font-semibold text-sm">{label}</p>
                <p className="text-xs text-base-content/50 leading-snug mt-0.5">{desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* ── Track row ── */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-base-content/40 mb-2">Track</p>
        <div className="grid grid-cols-3 gap-3">
          {([
            { label: 'Leaderboard', Icon: Trophy,     href: '/child/leaderboard' },
            { label: 'My Progress', Icon: TrendingUp, href: '/child/my-progress' },
            { label: 'Badges',      Icon: Award,      href: '/badges' },
          ] as const).map(({ label, Icon, href }) => (
            <Link
              key={label}
              href={href}
              className="rounded-xl bg-base-200 hover:bg-base-300 p-4 flex flex-col items-center gap-1.5 text-center transition-colors"
            >
              <Icon size={22} className="text-base-content/60" />
              <p className="text-xs font-medium leading-tight">{label}</p>
            </Link>
          ))}
        </div>
      </div>

    </div>
  )
}
