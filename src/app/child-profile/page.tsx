'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import type { AuthUser, ChildProfile } from '@/types/knowly'

function ChildProfileContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const childId = searchParams.get('id')

  const [child, setChild] = useState<ChildProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((user: AuthUser) => {
        const children = user.children ?? []
        const found = childId
          ? children.find((c) => String(c.child_id) === childId)
          : children[0]
        setChild(found ?? null)
      })
      .catch(() => router.push('/profiles'))
      .finally(() => setLoading(false))
  }, [router, childId])

  useEffect(() => {
    if (!loading && !child) {
      router.push('/profiles')
    }
  }, [loading, child, router])

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/')
  }

  if (loading || !child) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <span className="loading loading-spinner loading-lg" />
      </main>
    )
  }

  const avatarIndex = child.avatar_index ?? 1

  return (
    <main className="min-h-screen flex items-center justify-center bg-base-100 px-4">
      <div className="w-full max-w-sm flex flex-col items-center gap-10">
        <div className="text-center">
          <h1 className="text-4xl font-bold">Knowley</h1>
          <p className="text-base-content/60 mt-1">Child Profile</p>
        </div>

        <div className="w-40 h-40 rounded-full overflow-hidden border-4 border-base-300">
          <Image
            src={`/avatars/children/avatar-${avatarIndex}.png`}
            alt={child.display_name}
            width={160}
            height={160}
            className="object-cover w-full h-full"
          />
        </div>

        <div className="text-center">
          <p className="text-xl font-semibold">{child.display_name}</p>
          <p className="text-sm text-base-content/50">@{child.nickname}</p>
        </div>

        <div className="flex flex-col gap-3 w-full">
          <button
            onClick={() => router.push('/profiles')}
            className="btn btn-ghost btn-lg w-full border border-base-300"
          >
            Switch Account
          </button>
          <button onClick={handleLogout} className="btn btn-neutral btn-lg w-full">
            Logout
          </button>
        </div>
      </div>
    </main>
  )
}

export default function ChildProfilePage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen flex items-center justify-center">
          <span className="loading loading-spinner loading-lg" />
        </main>
      }
    >
      <ChildProfileContent />
    </Suspense>
  )
}
