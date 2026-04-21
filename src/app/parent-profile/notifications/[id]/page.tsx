'use client'

import { useRef, useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import type { AuthUser } from '@/types/knowly'
import NotificationDetail from '@/components/notifications/NotificationDetail'
import { useUnreadCount } from '@/hooks/useUnreadCount'

export default function ParentNotificationDetailPage() {
  const router = useRouter()
  const params = useParams()
  const id = parseInt(params.id as string, 10)

  const [user, setUser] = useState<AuthUser | null>(null)
  const [avatarMenuOpen, setAvatarMenuOpen] = useState(false)
  const avatarRef = useRef<HTMLDivElement>(null)
  const { unread, refresh: refreshCount } = useUnreadCount()

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((data: AuthUser) => setUser(data))
      .catch(() => router.push('/login'))
  }, [router])

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

  const avatarIndex = user?.avatar_index ?? 1

  return (
    <main className="min-h-screen bg-base-100 flex flex-col">
      <header className="sticky top-0 z-30 bg-base-100 border-b border-base-200">
        <div className="flex items-center justify-between px-4 h-14">
          <button onClick={() => router.back()} className="font-bold text-lg text-base-content/50 hover:text-base-content">
            ← Knowley
          </button>

          {user && (
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
                  <div className="px-4 py-2 border-b border-base-200">
                    <p className="font-semibold text-sm">{user.display_name}</p>
                    <p className="text-xs text-base-content/50">Parent Account</p>
                  </div>
                  <div className="flex flex-col py-1">
                    <Link href="/parent-profile/notifications" className="px-4 py-2 text-sm hover:bg-base-200 flex items-center justify-between" onClick={() => setAvatarMenuOpen(false)}>
                      Notifications
                      {unread > 0 && <span className="badge badge-sm badge-error">{unread}</span>}
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
          )}
        </div>
      </header>

      {/* Parents can respond — class invites require parent confirmation */}
      <NotificationDetail
        notificationId={id}
        canRespond={true}
        onRead={refreshCount}
      />
    </main>
  )
}
