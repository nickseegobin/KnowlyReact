'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import {
  Menu, Gem,
  Home, Compass, BookOpen, ClipboardCheck, Users,
  Trophy, TrendingUp, Award, Newspaper,
} from 'lucide-react'
import type { AuthUser } from '@/types/knowly'
import { useUnreadCount } from '@/hooks/useUnreadCount'
import { unlockAudio } from '@/lib/audioUnlock'

// Sidebar nav definition
const STUDY_NAV = [
  { label: 'Home',    Icon: Home,           href: '/child/home',        iconClass: 'bg-primary/10 text-primary' },
  { label: 'Quests',  Icon: Compass,        href: '/child/quests',      iconClass: 'bg-primary/10 text-primary' },
  { label: 'Lessons', Icon: BookOpen,       href: '/child/lessons',     iconClass: 'bg-info/10 text-info' },
  { label: 'Trials',  Icon: ClipboardCheck, href: '/child/trials',      iconClass: 'bg-warning/10 text-warning' },
  { label: 'Classes', Icon: Users,          href: '/child/classes',     iconClass: 'bg-success/10 text-success' },
] as const

const TRACK_NAV = [
  { label: 'Leaderboard', Icon: Trophy,     href: '/child/leaderboard', iconClass: 'bg-primary/10 text-primary' },
  { label: 'Progress',    Icon: TrendingUp, href: '/child/my-progress', iconClass: 'bg-info/10 text-info' },
  { label: 'Badges',      Icon: Award,      href: '/badges',            iconClass: 'bg-warning/10 text-warning' },
  { label: 'News',        Icon: Newspaper,  href: '/child/news',        iconClass: 'bg-base-200 text-base-content/50' },
] as const

interface Props {
  children: React.ReactNode
  user: AuthUser
  blueGems: number
  redGems?: number
}

export default function ChildLayout({ children, user, blueGems }: Props) {
  const router   = useRouter()
  const pathname = usePathname()
  const [drawerOpen,    setDrawerOpen]    = useState(false)
  const [avatarMenuOpen, setAvatarMenuOpen] = useState(false)
  const avatarRef = useRef<HTMLDivElement>(null)
  const { unread, refresh: refreshCount } = useUnreadCount()

  const [liveBlue, setLiveBlue] = useState(blueGems)

  const refreshGems = useCallback(async () => {
    try {
      const res = await fetch('/api/gems')
      if (res.ok) {
        const data = await res.json()
        setLiveBlue(data.balance ?? data.blue_gem_balance ?? 0)
      }
    } catch { /* keep current value */ }
  }, [])

  useEffect(() => {
    document.addEventListener('touchstart', unlockAudio, { once: true, passive: true })
    document.addEventListener('click',      unlockAudio, { once: true })
    return () => {
      document.removeEventListener('touchstart', unlockAudio)
      document.removeEventListener('click',      unlockAudio)
    }
  }, [])

  useEffect(() => { refreshGems() }, [pathname, refreshGems])

  useEffect(() => {
    function onVisibility() {
      if (document.visibilityState === 'visible') refreshGems()
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [refreshGems])

  useEffect(() => {
    function onGemUpdate(e: Event) {
      const balance = (e as CustomEvent<{ balance: number }>).detail?.balance
      if (typeof balance === 'number') setLiveBlue(balance)
    }
    window.addEventListener('knowly:gem-update', onGemUpdate)
    return () => window.removeEventListener('knowly:gem-update', onGemUpdate)
  }, [])

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (avatarRef.current && !avatarRef.current.contains(e.target as Node)) {
        setAvatarMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const activeChild = user.children?.find((c) => c.child_id === user.active_child_id) ?? user.children?.[0]
  const avatarIndex = activeChild?.avatar_index ?? 1
  const displayName = activeChild?.display_name ?? user.display_name
  const nickname    = activeChild?.nickname ?? ''

  function isActive(href: string) {
    if (href === '/child/home') return pathname === '/child/home'
    return pathname.startsWith(href)
  }

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/')
  }

  const AvatarDropdown = (
    <div className="relative" ref={avatarRef}>
      <button
        onClick={() => setAvatarMenuOpen((o) => !o)}
        className="relative w-9 h-9 rounded-full overflow-hidden border-2 border-base-300 focus:outline-none"
      >
        <Image
          src={`/avatars/children/avatar-${avatarIndex}.png`}
          alt={displayName}
          width={36}
          height={36}
          className="object-cover w-full h-full"
        />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-error rounded-full text-white text-[9px] font-bold flex items-center justify-center">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {avatarMenuOpen && (
        <div className="absolute right-0 top-11 w-56 bg-base-100 rounded-box shadow-xl border border-base-200 z-50 py-2">
          <div className="px-4 py-2 border-b border-base-200">
            <p className="font-semibold text-sm">{displayName}</p>
            {nickname && <p className="text-xs text-base-content/50">@{nickname}</p>}
          </div>
          <div className="flex flex-col py-1">
            <Link
              href="/child/notifications"
              className="px-4 py-2 text-sm hover:bg-base-200 flex items-center justify-between"
              onClick={() => { setAvatarMenuOpen(false); refreshCount() }}
            >
              Notifications
              {unread > 0 && <span className="badge badge-sm badge-error">{unread > 9 ? '9+' : unread}</span>}
            </Link>
            <Link href="/child/settings" className="px-4 py-2 text-sm hover:bg-base-200" onClick={() => setAvatarMenuOpen(false)}>
              My Settings
            </Link>
            <Link href="/child/settings/content" className="px-4 py-2 text-sm hover:bg-base-200" onClick={() => setAvatarMenuOpen(false)}>
              Content Settings
            </Link>
            <Link href="/child/leaderboard" className="px-4 py-2 text-sm hover:bg-base-200" onClick={() => setAvatarMenuOpen(false)}>
              Leaderboards
            </Link>
          </div>
          <div className="border-t border-base-200 flex flex-col py-1">
            <Link href="/profiles" className="px-4 py-2 text-sm hover:bg-base-200" onClick={() => setAvatarMenuOpen(false)}>
              Switch Profile
            </Link>
            <button onClick={handleLogout} className="px-4 py-2 text-sm text-left hover:bg-base-200">
              Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  )

  return (
    <div className="min-h-screen flex bg-base-100">

      {/* ── Mobile drawer overlay ── */}
      {drawerOpen && (
        <div className="fixed inset-0 z-40 bg-black/30 lg:hidden" onClick={() => setDrawerOpen(false)} />
      )}

      {/* ── Mobile slide-in drawer ── */}
      <aside
        className={`fixed top-0 left-0 h-full w-64 bg-base-100 z-50 shadow-xl flex flex-col transition-transform duration-300 lg:hidden ${
          drawerOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-6 pt-12 flex-1 flex flex-col gap-1">
          {[...STUDY_NAV, ...TRACK_NAV].map(({ label, Icon, href, iconClass }) => (
            <Link
              key={label}
              href={href}
              onClick={() => setDrawerOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${
                isActive(href) ? 'bg-primary/10 text-primary' : 'text-base-content hover:bg-base-200'
              }`}
            >
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${iconClass}`}>
                <Icon size={18} />
              </div>
              <span className="text-sm font-medium">{label}</span>
            </Link>
          ))}
        </div>
        <div className="p-6 border-t border-base-200 flex flex-col gap-2">
          <Link href="/profiles" className="text-sm py-2 hover:text-primary" onClick={() => setDrawerOpen(false)}>
            Switch Profile
          </Link>
          <button onClick={handleLogout} className="text-sm py-2 text-left hover:text-primary">
            Sign Out
          </button>
        </div>
      </aside>

      {/* ── Desktop sidebar ── */}
      <aside className="hidden lg:flex flex-col w-60 shrink-0 border-r border-base-200 sticky top-0 h-screen">
        <div className="px-6 py-5 border-b border-base-200">
          <span className="font-bold text-xl text-primary">Knowly</span>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 flex flex-col gap-1">
          {STUDY_NAV.map(({ label, Icon, href, iconClass }) => (
            <Link
              key={label}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${
                isActive(href) ? 'bg-primary/10 text-primary' : 'text-base-content hover:bg-base-200'
              }`}
            >
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${iconClass}`}>
                <Icon size={18} />
              </div>
              <span className="text-sm font-medium">{label}</span>
            </Link>
          ))}

          <div className="border-t border-base-200 my-2" />

          {TRACK_NAV.map(({ label, Icon, href, iconClass }) => (
            <Link
              key={label}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${
                isActive(href) ? 'bg-primary/10 text-primary' : 'text-base-content hover:bg-base-200'
              }`}
            >
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${iconClass}`}>
                <Icon size={18} />
              </div>
              <span className="text-sm font-medium">{label}</span>
            </Link>
          ))}
        </nav>

        <div className="px-6 py-4 border-t border-base-200 flex items-center gap-2">
          <Gem size={16} className="text-info" />
          <span className="text-sm font-semibold">{liveBlue}</span>
        </div>
      </aside>

      {/* ── Main column ── */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Top bar */}
        <header className="sticky top-0 z-30 bg-base-100 border-b border-base-200">
          <div className="flex items-center justify-between px-4 h-14">
            {/* Hamburger + logo (mobile only) */}
            <div className="flex items-center gap-3 lg:hidden">
              <button
                onClick={() => setDrawerOpen(true)}
                className="btn btn-ghost btn-sm btn-square"
                aria-label="Menu"
              >
                <Menu size={20} />
              </button>
              <span className="font-bold text-lg">Knowly</span>
            </div>

            {/* Spacer so gems/avatar stay right on desktop */}
            <div className="hidden lg:flex flex-1" />

            {/* Gems + avatar (always visible) */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <Gem size={18} className="text-info" />
                <span className="text-sm font-semibold">{liveBlue}</span>
              </div>
              {AvatarDropdown}
            </div>
          </div>

          {/* Tab bar (mobile only) */}
          <div className="flex lg:hidden border-t border-base-200 px-2">
            {STUDY_NAV.map(({ label, href }) => (
              <Link
                key={label}
                href={href}
                className={`tab text-xs px-3 py-2 flex-1 ${
                  isActive(href) ? 'tab-active font-semibold' : ''
                }`}
              >
                {label}
              </Link>
            ))}
          </div>
        </header>

        <main className="flex-1 px-4 py-4 lg:px-8">{children}</main>
      </div>

    </div>
  )
}
