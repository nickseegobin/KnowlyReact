'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import type { TeacherProfile } from '@/types/knowly'
import { useUnreadCount } from '@/hooks/useUnreadCount'

interface Props {
  children: React.ReactNode
  user: TeacherProfile
}

export default function TeacherLayout({ children, user }: Props) {
  const router = useRouter()
  const [avatarMenuOpen, setAvatarMenuOpen] = useState(false)
  const avatarRef = useRef<HTMLDivElement>(null)
  const { unread, refresh: refreshCount } = useUnreadCount()

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

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/')
  }

  const avatarIndex = user.avatar_index ?? 1

  return (
    <div className="min-h-screen flex flex-col bg-base-100">
      {/* ── Top navbar ── */}
      <header className="sticky top-0 z-30 bg-base-100 border-b border-base-200">
        <div className="flex items-center justify-between px-4 h-14">
          <span className="font-bold text-lg">Knowley</span>

          <div className="flex items-center gap-3">
            {/* Red gem balance */}
            <div className="flex items-center gap-1.5 bg-red-50 border border-red-200 rounded-full px-3 py-1">
              <Image src="/icons/red-gem.png" alt="Red gems" width={18} height={18} />
              <span className="font-bold text-red-600 text-sm">{user.red_gem_balance}</span>
            </div>

            {/* Avatar with dropdown */}
            <div className="relative" ref={avatarRef}>
              <button
                onClick={() => setAvatarMenuOpen((o) => !o)}
                className="relative w-9 h-9 rounded-full overflow-hidden border-2 border-base-300 focus:outline-none"
              >
                <Image
                  src={`/avatars/adults/avatar-${avatarIndex}.png`}
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
                  {/* Identity */}
                  <div className="px-4 py-2 border-b border-base-200">
                    <p className="font-semibold text-sm">{user.display_name}</p>
                    <p className="text-xs text-base-content/50">
                      {user.school_name ? `${user.school_name} · ` : ''}Teacher
                    </p>
                  </div>

                  {/* Links */}
                  <div className="flex flex-col py-1">
                    <Link
                      href="/teacher/notifications"
                      className="px-4 py-2 text-sm hover:bg-base-200 flex items-center justify-between"
                      onClick={() => { setAvatarMenuOpen(false); refreshCount() }}
                    >
                      Notifications
                      {unread > 0 && (
                        <span className="badge badge-sm badge-error">{unread > 9 ? '9+' : unread}</span>
                      )}
                    </Link>
                    <Link
                      href="/teacher-profile/settings"
                      className="px-4 py-2 text-sm hover:bg-base-200"
                      onClick={() => setAvatarMenuOpen(false)}
                    >
                      Settings
                    </Link>
                  </div>

                  {/* Sign out */}
                  <div className="border-t border-base-200 flex flex-col py-1">
                    <button
                      onClick={handleLogout}
                      className="px-4 py-2 text-sm text-left hover:bg-base-200"
                    >
                      Logout
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* ── Page content ── */}
      <main className="flex-1">{children}</main>
    </div>
  )
}
