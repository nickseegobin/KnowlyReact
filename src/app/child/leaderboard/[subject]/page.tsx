import { redirect } from 'next/navigation'
import { getTokenFromCookie } from '@/lib/cookies'
import { wpFetch } from '@/lib/wp-api'
import Breadcrumb from '@/components/child/Breadcrumb'
import Link from 'next/link'
import type { AuthUser } from '@/types/knowly'

interface BoardEntry {
  rank: number
  nickname: string
  total_points: number
  last_score_pct: number
  is_current_user: boolean
}

interface MyPosition {
  rank: number
  total_points: number
  nickname: string
}

interface BoardResponse {
  date?: string
  board_key?: string
  total_participants?: number
  entries: BoardEntry[]
  my_position?: MyPosition | null
}

const SUBJECT_SLUGS: Record<string, string> = {
  'Mathematics':           'math',
  'English Language Arts': 'english',
  'Science':               'science',
  'Social Studies':        'social_studies',
}

const LEVEL_LABELS: Record<string, string> = {
  std_4: 'Standard 4',
  std_5: 'Standard 5',
}

const PERIOD_LABELS: Record<string, string> = {
  term_1: 'Term 1',
  term_2: 'Term 2',
  term_3: 'Term 3',
}

const RANK_MEDAL: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' }

export default async function SubjectLeaderboardPage({
  params,
}: {
  params: Promise<{ subject: string }>
}) {
  const { subject: encodedSubject } = await params
  const subject = decodeURIComponent(encodedSubject)

  const token = await getTokenFromCookie()
  if (!token) redirect('/login')

  // Get active child's level + period to scope the board
  let level = 'std_4'
  let period = 'term_1'
  try {
    const user = await wpFetch<AuthUser>('/auth/me', 'GET', undefined, token)
    const active = user.children?.find((c) => c.child_id === user.active_child_id) ?? user.children?.[0]
    if (active) {
      level = active.level ?? 'std_4'
      period = active.period ?? 'term_1'
    }
  } catch {
    // fall back to defaults
  }

  const slug = SUBJECT_SLUGS[subject] ?? subject.toLowerCase().replace(/ /g, '_')
  const periodSegment = period || 'none'

  let board: BoardResponse | null = null
  let error = ''

  try {
    const qs = new URLSearchParams({ level, period: periodSegment })
    board = await wpFetch<BoardResponse>(
      `/leaderboard/${level}/${periodSegment}/${slug}?${qs}`,
      'GET',
      undefined,
      token
    )
  } catch {
    error = 'Could not load leaderboard. Try again later.'
  }

  const entries = board?.entries ?? []
  const me = board?.my_position ?? null
  const myInTop = entries.some((e) => e.is_current_user)
  const levelLabel = LEVEL_LABELS[level] ?? level
  const periodLabel = PERIOD_LABELS[period] ?? ''

  return (
    <div className="flex flex-col gap-4 pb-8">
      <div className="flex items-center gap-3">
        <Link href="/child/leaderboard" className="btn btn-circle btn-sm btn-ghost border border-base-300">‹</Link>
        <Breadcrumb crumbs={[
          { label: 'Home', href: '/child/home' },
          { label: 'Leaderboard', href: '/child/leaderboard' },
          { label: subject },
        ]} />
      </div>

      {/* Header */}
      <div className="flex flex-col items-center gap-1 py-2">
        <div className="text-4xl">🏆</div>
        <h1 className="text-2xl font-bold">{subject}</h1>
        <p className="text-sm text-base-content/60">
          {levelLabel}{periodLabel ? ` · ${periodLabel}` : ''} · Today&apos;s Board
        </p>
        {board?.total_participants != null && (
          <p className="text-xs text-base-content/40">{board.total_participants} player{board.total_participants !== 1 ? 's' : ''} competing</p>
        )}
      </div>

      {error && (
        <div className="alert alert-error text-sm"><span>{error}</span></div>
      )}

      {!error && entries.length === 0 && (
        <div className="card bg-base-200 rounded-2xl p-8 text-center">
          <p className="text-base-content/50 text-sm">No entries yet today.</p>
          <p className="text-base-content/40 text-xs mt-1">Complete a trial to appear on this board!</p>
        </div>
      )}

      {entries.length > 0 && (
        <div className="flex flex-col gap-2">
          {entries.map((entry) => {
            const medal = RANK_MEDAL[entry.rank]
            const isMe = entry.is_current_user
            return (
              <div
                key={entry.rank}
                className={`flex items-center gap-3 p-3 rounded-2xl transition-colors ${
                  isMe
                    ? 'bg-primary/15 border border-primary/30'
                    : entry.rank <= 3
                    ? 'bg-base-200'
                    : 'bg-base-200/60'
                }`}
              >
                {/* Rank */}
                <div className="w-10 shrink-0 text-center">
                  {medal ? (
                    <span className="text-2xl">{medal}</span>
                  ) : (
                    <span className="text-sm font-bold text-base-content/50">#{entry.rank}</span>
                  )}
                </div>

                {/* Nickname */}
                <div className="flex-1 min-w-0">
                  <p className={`font-semibold text-sm truncate ${isMe ? 'text-primary' : ''}`}>
                    {entry.nickname}
                    {isMe && <span className="ml-1 text-xs font-normal opacity-70">(you)</span>}
                  </p>
                </div>

                {/* Points */}
                <div className="text-right shrink-0">
                  <p className="font-bold text-sm">{entry.total_points} pts</p>
                  {entry.last_score_pct != null && (
                    <p className="text-xs text-base-content/40">{entry.last_score_pct}% last</p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Show user's position if they're outside top 10 */}
      {me && !myInTop && (
        <div className="flex flex-col gap-1 mt-2">
          <div className="flex items-center gap-2 text-xs text-base-content/40">
            <div className="flex-1 border-t border-dashed border-base-300" />
            <span>Your position</span>
            <div className="flex-1 border-t border-dashed border-base-300" />
          </div>
          <div className="flex items-center gap-3 p-3 rounded-2xl bg-primary/10 border border-primary/30">
            <div className="w-10 shrink-0 text-center">
              <span className="text-sm font-bold text-base-content/50">#{me.rank}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm text-primary truncate">
                {me.nickname} <span className="text-xs font-normal opacity-70">(you)</span>
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className="font-bold text-sm">{me.total_points} pts</p>
            </div>
          </div>
        </div>
      )}

      <Link href="/child/trials" className="btn btn-neutral btn-lg w-full mt-2">
        Do a Trial to Earn Points
      </Link>
    </div>
  )
}
