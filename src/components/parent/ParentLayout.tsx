'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import {
  Menu, Gem,
  Home, BarChart2, Bell, UserPlus,
  Receipt, Settings2, Newspaper,
} from 'lucide-react'
import type { AuthUser } from '@/types/knowly'
import { useUnreadCount } from '@/hooks/useUnreadCount'

const MAIN_NAV = [
  { label: 'Home',          Icon: Home,      href: '/parent-profile',               iconClass: 'bg-primary/10 text-primary' },
  { label: 'Analytics',     Icon: BarChart2, href: '/parent-profile/analytics',      iconClass: 'bg-info/10 text-info' },
  { label: 'Gems',          Icon: Gem,       href: '/parent-profile/gems',           iconClass: 'bg-primary/10 text-primary' },
  { label: 'Notifications', Icon: Bell,      href: '/parent-profile/notifications',  iconClass: 'bg-warning/10 text-warning' },
] as const

const ACCOUNT_NAV = [
  { label: 'News',      Icon: Newspaper, href: '/parent-profile/news',     iconClass: 'bg-base-200 text-base-content/60' },
  { label: 'Orders',    Icon: Receipt,   href: '/parent-profile/orders',   iconClass: 'bg-base-200 text-base-content/60' },
  { label: 'Settings',  Icon: Settings2, href: '/parent-profile/settings', iconClass: 'bg-base-200 text-base-content/60' },
  { label: 'Add Child', Icon: UserPlus,  href: '/register/add-child',      iconClass: 'bg-success/10 text-success' },
] as const

interface Props {
  children: React.ReactNode
  user: AuthUser
  blueGems: number
}

export default function ParentLayout({ children, user, blueGems }: Props) {
  const router   = useRouter()
  const pathname = usePathname()
  const [drawerOpen,     setDrawerOpen]     = useState(false)
  const [avatarMenuOpen, setAvatarMenuOpen] = useState(false)
  const avatarRef = useRef<HTMLDivElement>(null)
  const { unread, refresh: refreshCount } = useUnreadCount()

  const [liveBlue, setLiveBlue] = useState(blueGems)

  const refreshGems = useCallback(async () => {
    try {
      const res = await fetch('/api/gems?scope=parent')
      if (res.ok) {
        const d = await res.json()
        setLiveBlue(d.balance ?? d.blue_gem_balance ?? 0)
      }
    } catch { /* keep current */ }
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

  function isActive(href: string) {
    if (href === '/parent-profile') return pathname === '/parent-profile'
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
          src={`/avatars/adults/avatar-${user.avatar_index ?? 1}.png`}
          alt={user.display_name}
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
            <p className="font-semibold text-sm">{user.display_name}</p>
            <p className="text-xs text-base-content/50">Parent Account</p>
          </div>
          <div className="flex flex-col py-1">
            <Link
              href="/parent-profile/notifications"
              className="px-4 py-2 text-sm hover:bg-base-200 flex items-center justify-between"
              onClick={() => { setAvatarMenuOpen(false); refreshCount() }}
            >
              Notifications
              {unread > 0 && <span className="badge badge-sm badge-error">{unread > 9 ? '9+' : unread}</span>}
            </Link>
            <Link href="/parent-profile/orders" className="px-4 py-2 text-sm hover:bg-base-200" onClick={() => setAvatarMenuOpen(false)}>
              Orders
            </Link>
            <Link href="/parent-profile/settings" className="px-4 py-2 text-sm hover:bg-base-200" onClick={() => setAvatarMenuOpen(false)}>
              Settings
            </Link>
            <Link href="/register/add-child" className="px-4 py-2 text-sm hover:bg-base-200" onClick={() => setAvatarMenuOpen(false)}>
              Add Child
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

  const NavLink = ({ label, Icon, href, iconClass }: { label: string; Icon: React.ElementType; href: string; iconClass: string }) => (
    <Link
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
          {MAIN_NAV.map((item) => <NavLink key={item.label} {...item} />)}
          <div className="border-t border-base-200 my-2" />
          {ACCOUNT_NAV.map((item) => <NavLink key={item.label} {...item} />)}
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
          {MAIN_NAV.map((item) => <NavLink key={item.label} {...item} />)}
          <div className="border-t border-base-200 my-2" />
          {ACCOUNT_NAV.map((item) => <NavLink key={item.label} {...item} />)}
        </nav>

        <div className="px-6 py-4 border-t border-base-200 flex items-center gap-2">
          <Gem size={16} className="text-primary" />
          <span className="text-sm font-semibold">{liveBlue}</span>
          <span className="text-xs text-base-content/40 ml-1">gems</span>
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

            <div className="hidden lg:flex flex-1" />

            {/* Gems + avatar */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <Gem size={18} className="text-primary" />
                <span className="text-sm font-semibold">{liveBlue}</span>
              </div>
              {AvatarDropdown}
            </div>
          </div>

          {/* Mobile tab bar */}
          <div className="flex lg:hidden border-t border-base-200 px-2">
            {MAIN_NAV.map(({ label, href }) => (
              <Link
                key={label}
                href={href}
                className={`tab text-xs px-3 py-2 flex-1 ${isActive(href) ? 'tab-active font-semibold' : ''}`}
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
