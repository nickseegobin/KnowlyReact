'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import type { AuthUser, ChildProfile } from '@/types/knowly'

const MAX_CHILDREN = 3

export default function ProfilesPage() {
  const router = useRouter()
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((data) => setUser(data))
      .catch(() => router.push('/login'))
      .finally(() => setLoading(false))
  }, [router])

  async function handleSelectChild(child: ChildProfile) {
    await fetch(`/api/children/${child.child_id}/switch`, { method: 'POST' })
    router.push('/child/home')
  }

  function handleSelectParent() {
    router.push('/register/verify-pin')
  }

  function handleAddChild() {
    router.push('/register/add-child')
  }

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/')
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <span className="loading loading-spinner loading-lg" />
      </main>
    )
  }

  if (!user) return null

  const children = user.children ?? []
  const emptySlots = Math.max(0, MAX_CHILDREN - children.length)
  const parentAvatarIndex = user.avatar_index ?? 1

  return (
    <main className="min-h-screen flex items-center justify-center bg-base-100 px-4 py-12">
      <div className="w-full max-w-sm flex flex-col items-center gap-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold">Knowley</h1>
          <p className="text-base-content/60 mt-1">Select Profile</p>
        </div>

        {/* ── Child profiles ── */}
        <div className="grid grid-cols-2 gap-6 w-full">
          {children.map((child) => (
            <button
              key={child.child_id}
              onClick={() => handleSelectChild(child)}
              className="flex flex-col items-center gap-2 group"
            >
              <div className="relative w-28 h-28 rounded-full overflow-hidden border-4 border-base-300 group-hover:border-neutral transition-colors">
                <Image
                  src={`/avatars/children/avatar-${child.avatar_index ?? 1}.png`}
                  alt={child.display_name}
                  fill
                  className="object-cover"
                />
              </div>
              <span className="text-sm font-medium">{child.display_name}</span>
            </button>
          ))}

          {/* Empty slots → add child */}
          {Array.from({ length: emptySlots }).map((_, i) => (
            <button
              key={`empty-${i}`}
              onClick={handleAddChild}
              className="flex flex-col items-center gap-2 group"
            >
              <div className="w-28 h-28 rounded-full bg-base-300 flex items-center justify-center group-hover:bg-base-content/20 transition-colors">
                <span className="text-4xl text-base-content/40 group-hover:text-base-content/60">+</span>
              </div>
              <span className="text-sm text-base-content/40">Add Child</span>
            </button>
          ))}
        </div>

        <div className="divider" />

        {/* ── Parent profile button ── */}
        <button
          onClick={handleSelectParent}
          className="flex items-center gap-4 w-full hover:opacity-80 transition-opacity"
        >
          <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-base-300 shrink-0">
            <Image
              src={`/avatars/adults/avatar-${parentAvatarIndex}.png`}
              alt={user.display_name}
              width={56}
              height={56}
              className="object-cover w-full h-full"
            />
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold">{user.display_name}</p>
            <p className="text-xs text-base-content/50">Parent Account</p>
          </div>
          <span className="ml-auto text-base-content/30 text-sm">›</span>
        </button>

        <button onClick={handleLogout} className="btn btn-ghost btn-sm w-full">
          Logout
        </button>
      </div>
    </main>
  )
}
