import { redirect } from 'next/navigation'
import { getTokenFromCookie } from '@/lib/cookies'
import { wpFetch } from '@/lib/wp-api'
import Link from 'next/link'
import { SlidersHorizontal } from 'lucide-react'
import type { AuthUser } from '@/types/knowly'
import { SUBJECT_ORDER, SUBJECT_SHORT, SUBJECT_DISPLAY } from '@/lib/subject-catalogue'

// ── Types ─────────────────────────────────────────────────────────────────────

interface BoardEntry {
  rank:            number
  nickname:        string
  total_points:    number
  last_score_pct:  number
  is_current_user: boolean
}

interface MyPosition {
  rank:         number
  total_points: number
  nickname:     string
}

interface BoardResponse {
  date?:               string
  total_participants?: number
  entries:             BoardEntry[]
  my_position?:        MyPosition | null
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function levelLabel(v: string) {
  return v === 'std_4' ? 'Standard 4' : v === 'std_5' ? 'Standard 5' : v
}

function periodLabel(v: string) {
  const map: Record<string, string> = { term_1: 'Term 1', term_2: 'Term 2', term_3: 'Term 3' }
  return map[v] ?? v
}

const RANK_MEDAL: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' }

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function LeaderboardPage({
  searchParams,
}: {
  searchParams: Promise<{ subject?: string }>
}) {
  const token = await getTokenFromCookie()
  if (!token) redirect('/login')

  let level  = 'std_4'
  let period = 'term_1'
  let levelText = ''

  try {
    const user   = await wpFetch<AuthUser>('/auth/me', 'GET', undefined, token)
    const active = user.children?.find((c) => c.child_id === user.active_child_id) ?? user.children?.[0]
    if (active) {
      level  = active.level  ?? 'std_4'
      period = active.period ?? 'term_1'
      levelText = period
        ? `${levelLabel(level)} · ${periodLabel(period)}`
        : levelLabel(level)
    }
  } catch {}

  const { subject: subjectParam = '' } = await searchParams
  const selectedSubject = SUBJECT_ORDER.includes(subjectParam as never)
    ? subjectParam
    : SUBJECT_ORDER[0]

  const periodSegment = period || 'none'

  let board: BoardResponse | null = null
  let error = ''

  try {
    const qs = new URLSearchParams({ level, period: periodSegment })
    board = await wpFetch<BoardResponse>(
      `/leaderboard/${level}/${periodSegment}/${selectedSubject}?${qs}`,
      'GET',
      undefined,
      token
    )
  } catch {
    error = 'Could not load leaderboard. Try again later.'
  }

  const entries  = board?.entries ?? []
  const me       = board?.my_position ?? null
  const myInTop  = entries.some((e) => e.is_current_user)

  return (
    <div className="flex flex-col gap-4 pb-8">

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Leaderboard</h1>
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

      {/* Subject pills */}
      <div className="flex gap-2 flex-wrap">
        {SUBJECT_ORDER.map((subj) => (
          <Link
            key={subj}
            href={`/child/leaderboard?subject=${subj}`}
            className={`btn btn-sm rounded-full ${
              subj === selectedSubject ? 'btn-primary' : 'btn-ghost border border-base-300'
            }`}
          >
            {SUBJECT_SHORT[subj] ?? subj}
          </Link>
        ))}
      </div>

      {/* Subject banner */}
      <div className="flex items-center gap-3">
        <p className="font-semibold text-base">{SUBJECT_DISPLAY[selectedSubject]}</p>
        {board?.total_participants != null && (
          <span className="text-xs text-base-content/40">
            {board.total_participants} player{board.total_participants !== 1 ? 's' : ''} today
          </span>
        )}
        <div className="flex-1 h-px bg-base-200" />
      </div>

      {/* Error */}
      {error && (
        <div className="alert alert-error text-sm"><span>{error}</span></div>
      )}

      {/* Empty state */}
      {!error && entries.length === 0 && (
        <div className="bg-base-200 rounded-2xl p-8 text-center">
          <div className="text-4xl mb-3">🏆</div>
          <p className="text-base-content/50 text-sm">No entries yet today.</p>
          <p className="text-base-content/40 text-xs mt-1">Complete a trial to appear on this board!</p>
        </div>
      )}

      {/* Leaderboard entries */}
      {entries.length > 0 && (
        <div className="flex flex-col gap-2">
          {entries.map((entry) => {
            const medal = RANK_MEDAL[entry.rank]
            const isMe  = entry.is_current_user
            return (
              <div
                key={entry.rank}
                className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-colors ${
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

      {/* User outside top 10 */}
      {me && !myInTop && (
        <div className="flex flex-col gap-1 mt-1">
          <div className="flex items-center gap-2 text-xs text-base-content/40">
            <div className="flex-1 border-t border-dashed border-base-300" />
            <span>Your position</span>
            <div className="flex-1 border-t border-dashed border-base-300" />
          </div>
          <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-primary/10 border border-primary/30">
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

      {/* CTA */}
      <Link href="/child/trials" className="btn btn-neutral btn-lg w-full mt-2">
        Do a Trial to Earn Points
      </Link>
    </div>
  )
}
