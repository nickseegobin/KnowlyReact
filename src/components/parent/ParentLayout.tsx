'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import type { AuthUser } from '@/types/knowly'
import { useUnreadCount } from '@/hooks/useUnreadCount'

interface Props {
  children: React.ReactNode
  user: AuthUser
  blueGems: number
}

const TABS = [
  { label: 'Home',      href: '/parent-profile' },
  { label: 'Gems',      href: '/parent-profile/gems' },
  { label: 'Analytics', href: '/parent-profile/analytics' },
]

export default function ParentLayout({ children, user, blueGems }: Props) {
  const router   = useRouter()
  const pathname = usePathname()
  const [drawerOpen,    setDrawerOpen]    = useState(false)
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
    function onOutsideClick(e: MouseEvent) {
      if (avatarRef.current && !avatarRef.current.contains(e.target as Node)) {
        setAvatarMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', onOutsideClick)
    return () => document.removeEventListener('mousedown', onOutsideClick)
  }, [])

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/')
  }

  return (
    <div className="min-h-screen flex flex-col bg-base-100">

      {/* ── Drawer overlay ── */}
      {drawerOpen && (
        <div className="fixed inset-0 z-40 bg-black/30" onClick={() => setDrawerOpen(false)} />
      )}

      {/* ── Slide-in drawer ── */}
      <aside
        className={`fixed top-0 left-0 h-full w-64 bg-base-100 z-50 shadow-xl flex flex-col transition-transform duration-300 ${
          drawerOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-6 flex-1 flex flex-col gap-2 pt-12">
          {TABS.map(({ label, href }) => (
            <Link key={label} href={href} className="text-lg py-2" onClick={() => setDrawerOpen(false)}>
              {label}
            </Link>
          ))}
          <Link href="/register/add-child" className="text-lg py-2" onClick={() => setDrawerOpen(false)}>
            Add Child
          </Link>
        </div>
        <div className="p-6 border-t border-base-200 flex flex-col gap-2">
          <Link href="/profiles" className="text-lg py-2" onClick={() => setDrawerOpen(false)}>Switch Profile</Link>
          <button onClick={handleLogout} className="text-lg py-2 text-left">Logout</button>
        </div>
      </aside>

      {/* ── Top navbar ── */}
      <header className="sticky top-0 z-30 bg-base-100 border-b border-base-200">
        <div className="flex items-center justify-between px-4 h-14">

          <div className="flex items-center gap-3">
            <button
              onClick={() => setDrawerOpen(true)}
              className="btn btn-ghost btn-sm btn-square"
              aria-label="Menu"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                <rect y="3" width="20" height="2" rx="1"/>
                <rect y="9" width="20" height="2" rx="1"/>
                <rect y="15" width="20" height="2" rx="1"/>
              </svg>
            </button>
            <span className="font-bold text-lg">Knowley</span>
          </div>

          <div className="flex items-center gap-3">
            {/* Blue gem wallet */}
            <div className="flex items-center gap-1.5 bg-blue-50 border border-blue-200 rounded-full px-3 py-1">
              <Image src="/icons/blue-gem.png" alt="Blue gems" width={18} height={18} />
              <span className="font-bold text-blue-700 text-sm">{liveBlue}</span>
            </div>

            {/* Avatar with dropdown */}
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
                    <Link
                      href="/register/add-child"
                      className="px-4 py-2 text-sm hover:bg-base-200"
                      onClick={() => setAvatarMenuOpen(false)}
                    >
                      Add Child
                    </Link>
                    <Link
                      href="/parent-profile/orders"
                      className="px-4 py-2 text-sm hover:bg-base-200"
                      onClick={() => setAvatarMenuOpen(false)}
                    >
                      Orders
                    </Link>
                    <Link
                      href="/parent-profile/settings"
                      className="px-4 py-2 text-sm hover:bg-base-200"
                      onClick={() => setAvatarMenuOpen(false)}
                    >
                      Settings
                    </Link>
                  </div>
                  <div className="border-t border-base-200 flex flex-col py-1">
                    <Link
                      href="/profiles"
                      className="px-4 py-2 text-sm hover:bg-base-200"
                      onClick={() => setAvatarMenuOpen(false)}
                    >
                      Switch Profile
                    </Link>
                    <button onClick={handleLogout} className="px-4 py-2 text-sm text-left hover:bg-base-200">
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Tab bar ── */}
        <div className="flex border-b border-base-200 px-4">
          {TABS.map(({ label, href }) => {
            const isActive = href === '/parent-profile'
              ? pathname === href
              : pathname.startsWith(href)
            return (
              <Link
                key={label}
                href={href}
                className={`tab tab-bordered text-sm px-4 py-2 ${isActive ? 'tab-active font-medium' : ''}`}
              >
                {label}
              </Link>
            )
          })}
        </div>
      </header>

      {/* ── Page content ── */}
      <main className="flex-1 px-4 py-4">{children}</main>
    </div>
  )
}
