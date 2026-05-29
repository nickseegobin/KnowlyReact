'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import {
  Gem, BarChart2, Bell, UserPlus, ChevronRight,
  ClipboardCheck, Compass, BookOpen,
} from 'lucide-react'
import type { AuthUser, ChildProfile } from '@/types/knowly'

type StatsPeriod = 'week' | 'month' | 'all'

interface ChildActivityStats {
  user_id:         number
  trial_count:     number
  quest_count:     number
  lesson_count:    number
  weekly_trials:   number
  weekly_quests:   number
  weekly_lessons:  number
  monthly_trials:  number
  monthly_quests:  number
  monthly_lessons: number
}

const STAT_PERIODS: { value: StatsPeriod; label: string }[] = [
  { value: 'week',  label: 'This Week'  },
  { value: 'month', label: 'This Month' },
  { value: 'all',   label: 'All Time'   },
]

function pickCount(stats: ChildActivityStats | undefined, period: StatsPeriod, key: 'trials' | 'quests' | 'lessons'): number {
  if (!stats) return 0
  if (period === 'week')  return stats[`weekly_${key}`]  ?? 0
  if (period === 'month') return stats[`monthly_${key}`] ?? 0
  const map = { trials: stats.trial_count, quests: stats.quest_count, lessons: stats.lesson_count }
  return map[key] ?? 0
}

function timeGreeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

function levelLabel(level: string) {
  return level === 'std_4' ? 'Standard 4' : level === 'std_5' ? 'Standard 5' : level
}

function periodLabel(period: string) {
  const map: Record<string, string> = { term_1: 'Term 1', term_2: 'Term 2', term_3: 'Term 3' }
  return map[period] ?? period
}

const QUICK_LINKS = [
  {
    label: 'Analytics',
    desc:  'View progress reports',
    Icon:  BarChart2,
    href:  '/parent-profile/analytics',
    iconClass: 'bg-info/10 text-info',
  },
  {
    label: 'Gems',
    desc:  'Top up or buy gems',
    Icon:  Gem,
    href:  '/parent-profile/gems',
    iconClass: 'bg-primary/10 text-primary',
  },
  {
    label: 'Notifications',
    desc:  'Alerts & updates',
    Icon:  Bell,
    href:  '/parent-profile/notifications',
    iconClass: 'bg-warning/10 text-warning',
  },
  {
    label: 'Add Child',
    desc:  'Register another student',
    Icon:  UserPlus,
    href:  '/register/add-child',
    iconClass: 'bg-success/10 text-success',
  },
] as const

export default function ParentProfilePage() {
  const router = useRouter()
  const [user,       setUser]       = useState<AuthUser | null>(null)
  const [gemBalance, setGemBalance] = useState(0)
  const [loading,    setLoading]    = useState(true)

  const [childStats,   setChildStats]   = useState<Record<number, ChildActivityStats>>({})
  const [statsPeriod,  setStatsPeriod]  = useState<StatsPeriod>('week')

  const [amounts,  setAmounts]  = useState<Record<number, number>>({})
  const [sending,  setSending]  = useState<Record<number, boolean>>({})
  const [feedback, setFeedback] = useState<Record<number, { ok: boolean; msg: string }>>({})

  useEffect(() => {
    Promise.all([
      fetch('/api/auth/me').then((r) => r.json()),
      fetch('/api/analytics/self').then((r) => r.ok ? r.json() : null).catch(() => null),
    ])
      .then(([userData, analyticsData]) => {
        setUser(userData)
        setGemBalance(userData.gem_balance ?? 0)

        if (analyticsData) {
          const map: Record<number, ChildActivityStats> = {}
          if (Array.isArray(analyticsData.children)) {
            analyticsData.children.forEach((c: ChildActivityStats) => { map[c.user_id] = c })
          } else if (analyticsData.user_id) {
            map[analyticsData.user_id] = analyticsData as ChildActivityStats
          }
          setChildStats(map)
        }
      })
      .catch(() => router.push('/login'))
      .finally(() => setLoading(false))
  }, [router])

  async function assignGems(child: ChildProfile) {
    const amount = amounts[child.child_id] ?? 0
    if (amount <= 0) {
      setFeedback((f) => ({ ...f, [child.child_id]: { ok: false, msg: 'Enter a valid amount.' } }))
      return
    }
    setSending((s) => ({ ...s, [child.child_id]: true }))
    setFeedback((f) => ({ ...f, [child.child_id]: { ok: true, msg: '' } }))

    try {
      const res  = await fetch('/api/gems/allocate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ child_id: child.child_id, amount }),
      })
      const data = await res.json()
      if (!res.ok) {
        setFeedback((f) => ({ ...f, [child.child_id]: { ok: false, msg: data.message ?? 'Failed.' } }))
      } else {
        const newBalance = data.parent_balance_after ?? data.balance_after ?? gemBalance - amount
        setGemBalance(newBalance)
        window.dispatchEvent(new CustomEvent('knowly:gem-update', { detail: { balance: newBalance } }))
        setAmounts((a) => ({ ...a, [child.child_id]: 0 }))
        setFeedback((f) => ({ ...f, [child.child_id]: { ok: true, msg: `Sent ${amount} gem${amount !== 1 ? 's' : ''}!` } }))
      }
    } catch {
      setFeedback((f) => ({ ...f, [child.child_id]: { ok: false, msg: 'Something went wrong.' } }))
    } finally {
      setSending((s) => ({ ...s, [child.child_id]: false }))
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <span className="loading loading-spinner loading-lg" />
      </div>
    )
  }

  if (!user) return null

  const firstName = user.display_name.split(' ')[0]
  const children  = user.children ?? []

  return (
    <div className="flex flex-col gap-6 max-w-2xl mx-auto w-full">

      {/* ── Greeting ── */}
      <div>
        <h1 className="text-3xl font-bold">{timeGreeting()}, {firstName}!</h1>
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          <div className="flex items-center gap-1.5 bg-base-200 rounded-full px-3 py-1">
            <Gem size={14} className="text-primary" />
            <span className="text-sm font-semibold">{gemBalance} gems</span>
          </div>
          <span className="text-sm text-base-content/50">Parent Account</span>
        </div>
      </div>

      {/* ── Children overview ── */}
      {children.length === 0 ? (
        <div className="bg-base-200 rounded-2xl p-8 flex flex-col items-center gap-3 text-center">
          <UserPlus size={32} className="text-base-content/30" />
          <div>
            <p className="font-semibold text-base-content/70">No children added yet</p>
            <p className="text-sm text-base-content/40 mt-1">Add a child account to start tracking progress</p>
          </div>
          <Link href="/register/add-child" className="btn btn-primary btn-sm mt-1">
            Add Child
          </Link>
        </div>
      ) : (
        <section className="flex flex-col gap-3">
          <div className="flex items-center gap-3 flex-wrap">
            <p className="font-semibold text-base">Your Children</p>
            <div className="flex-1 h-px bg-base-200" />
            <div className="flex gap-0.5 bg-base-200 rounded-lg p-0.5">
              {STAT_PERIODS.map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => setStatsPeriod(value)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                    statsPeriod === value
                      ? 'bg-base-100 shadow-sm text-base-content'
                      : 'text-base-content/50 hover:text-base-content'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {children.map((child) => {
            const isSending = sending[child.child_id] ?? false
            const fb        = feedback[child.child_id]
            const lvl       = child.level ? levelLabel(child.level) : ''
            const per       = child.period ? periodLabel(child.period) : ''
            const subtitle  = [lvl, per].filter(Boolean).join(' · ')

            const stats = childStats[child.child_id]

            return (
              <div key={child.child_id} className="bg-base-200 rounded-2xl p-4 flex flex-col gap-4">
                {/* Child identity row */}
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full overflow-hidden border-2 border-base-300 shrink-0">
                    <Image
                      src={`/avatars/children/avatar-${child.avatar_index ?? 1}.png`}
                      alt={child.display_name}
                      width={44}
                      height={44}
                      className="object-cover w-full h-full"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm">{child.display_name}</p>
                    {subtitle && <p className="text-xs text-base-content/50">{subtitle}</p>}
                  </div>
                  <Link
                    href="/parent-profile/analytics"
                    className="btn btn-ghost btn-xs gap-1 text-base-content/50 hover:text-primary"
                  >
                    Progress <ChevronRight size={12} />
                  </Link>
                </div>

                {/* Activity counters */}
                <div className="flex gap-2 flex-wrap">
                  {(() => {
                    const t = pickCount(stats, statsPeriod, 'trials')
                    const q = pickCount(stats, statsPeriod, 'quests')
                    const l = pickCount(stats, statsPeriod, 'lessons')
                    return (
                      <>
                        <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-base-100 text-xs font-medium">
                          <ClipboardCheck size={11} className="text-warning" />
                          {t} {t === 1 ? 'trial' : 'trials'}
                        </span>
                        <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-base-100 text-xs font-medium">
                          <Compass size={11} className="text-primary" />
                          {q} {q === 1 ? 'quest' : 'quests'}
                        </span>
                        <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-base-100 text-xs font-medium">
                          <BookOpen size={11} className="text-info" />
                          {l} {l === 1 ? 'lesson' : 'lessons'}
                        </span>
                      </>
                    )
                  })()}
                </div>

                {/* Gem assignment row */}
                <div className="flex items-center gap-2">
                  <Gem size={14} className="text-primary shrink-0" />
                  <input
                    type="number"
                    min={1}
                    max={gemBalance}
                    value={amounts[child.child_id] ?? ''}
                    onChange={(e) =>
                      setAmounts((a) => ({ ...a, [child.child_id]: parseInt(e.target.value) || 0 }))
                    }
                    placeholder="Send gems…"
                    className="input input-sm input-bordered flex-1"
                  />
                  <button
                    onClick={() => assignGems(child)}
                    disabled={isSending}
                    className="btn btn-sm btn-primary"
                  >
                    {isSending ? <span className="loading loading-spinner loading-xs" /> : 'Send'}
                  </button>
                </div>

                {fb?.msg && (
                  <p className={`text-xs -mt-2 ${fb.ok ? 'text-success' : 'text-error'}`}>{fb.msg}</p>
                )}
              </div>
            )
          })}
        </section>
      )}

      {/* ── Quick links ── */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <p className="font-semibold text-base">Quick Access</p>
          <div className="flex-1 h-px bg-base-200" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          {QUICK_LINKS.map(({ label, desc, Icon, href, iconClass }) => (
            <Link
              key={label}
              href={href}
              className="flex flex-col gap-3 p-4 rounded-2xl bg-base-200 hover:bg-base-300 transition-colors group"
            >
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${iconClass}`}>
                <Icon size={22} />
              </div>
              <div>
                <p className="font-semibold text-sm">{label}</p>
                <p className="text-xs text-base-content/50 mt-0.5">{desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

    </div>
  )
}
