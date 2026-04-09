'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import type { AuthUser } from '@/types/knowly'

interface Props {
  children: React.ReactNode
  user: AuthUser
  blueGems: number
  redGems: number
}

const SUBJECTS = ['Mathematics', 'English Language Arts', 'Science', 'Social Studies']

export default function ChildLayout({ children, user, blueGems, redGems }: Props) {
  const router = useRouter()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [avatarMenuOpen, setAvatarMenuOpen] = useState(false)
  const avatarRef = useRef<HTMLDivElement>(null)

  // Close avatar menu on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (avatarRef.current && !avatarRef.current.contains(e.target as Node)) {
        setAvatarMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const activeChild = user.children?.find(
    (c) => c.child_id === user.active_child_id
  ) ?? user.children?.[0]

  const avatarIndex = activeChild?.avatar_index ?? 1
  const displayName = activeChild?.display_name ?? user.display_name
  const nickname = activeChild?.nickname ?? ''

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/')
  }

  return (
    <div className="min-h-screen flex flex-col bg-base-100">
      {/* ── Drawer overlay ── */}
      {drawerOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30"
          onClick={() => setDrawerOpen(false)}
        />
      )}

      {/* ── Slide-in drawer ── */}
      <aside
        className={`fixed top-0 left-0 h-full w-64 bg-base-100 z-50 shadow-xl flex flex-col transition-transform duration-300 ${
          drawerOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-6 flex-1 flex flex-col gap-2 pt-12">
          <Link href="/child/home" className="text-lg py-2" onClick={() => setDrawerOpen(false)}>Home</Link>
          <Link href="/leaderboard" className="text-lg py-2 text-base-content/50" onClick={() => setDrawerOpen(false)}>Leaderboards</Link>
          <Link href="/my-progress" className="text-lg py-2 text-base-content/50" onClick={() => setDrawerOpen(false)}>My Progress</Link>
          <Link href="/news" className="text-lg py-2 text-base-content/50" onClick={() => setDrawerOpen(false)}>News</Link>
        </div>
        <div className="p-6 border-t border-base-200 flex flex-col gap-2">
          <Link href="/profiles" className="text-lg py-2" onClick={() => setDrawerOpen(false)}>Switch Profile</Link>
          <button onClick={handleLogout} className="text-lg py-2 text-left">Logout</button>
        </div>
      </aside>

      {/* ── Top navbar ── */}
      <header className="sticky top-0 z-30 bg-base-100 border-b border-base-200">
        <div className="flex items-center justify-between px-4 h-14">
          {/* Hamburger + Logo */}
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

          {/* Gem balances + avatar */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <Image src="/icons/blue-gem.png" alt="Blue gems" width={22} height={22} />
              <span className="text-sm font-semibold">{blueGems}</span>
            </div>
            <div className="flex items-center gap-1">
              <Image src="/icons/red-gem.png" alt="Red gems" width={22} height={22} />
              <span className="text-sm font-semibold">{redGems}</span>
            </div>

            {/* Avatar with dropdown */}
            <div className="relative" ref={avatarRef}>
              <button
                onClick={() => setAvatarMenuOpen((o) => !o)}
                className="w-9 h-9 rounded-full overflow-hidden border-2 border-base-300 focus:outline-none"
              >
                <Image
                  src={`/avatars/children/avatar-${avatarIndex}.png`}
                  alt={displayName}
                  width={36}
                  height={36}
                  className="object-cover w-full h-full"
                />
              </button>

              {avatarMenuOpen && (
                <div className="absolute right-0 top-11 w-56 bg-base-100 rounded-box shadow-xl border border-base-200 z-50 py-2">
                  <div className="px-4 py-2 border-b border-base-200">
                    <p className="font-semibold text-sm">{displayName}</p>
                    {nickname && <p className="text-xs text-base-content/50">@{nickname}</p>}
                  </div>
                  <div className="flex flex-col py-1">
                    <span className="px-4 py-2 text-sm text-base-content/40 cursor-not-allowed">Notifications</span>
                    <span className="px-4 py-2 text-sm text-base-content/40 cursor-not-allowed">My Settings</span>
                    <span className="px-4 py-2 text-sm text-base-content/40 cursor-not-allowed">Content Settings</span>
                    <span className="px-4 py-2 text-sm text-base-content/40 cursor-not-allowed">Leaderboards</span>
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
          </div>
        </div>

        {/* ── Tab bar ── */}
        <div className="flex border-b border-base-200 px-4">
          {[
            { label: 'Home', href: '/child/home' },
            { label: 'Trials', href: '/child/trials' },
            { label: 'Quests', href: '/child/quests' },
            { label: 'Classes', href: '/child/classes' },
          ].map(({ label, href }) => (
            <Link
              key={label}
              href={href}
              className="tab tab-bordered text-sm px-4 py-2"
            >
              {label}
            </Link>
          ))}
        </div>
      </header>

      {/* ── Page content ── */}
      <main className="flex-1 px-4 py-4">{children}</main>
    </div>
  )
}
