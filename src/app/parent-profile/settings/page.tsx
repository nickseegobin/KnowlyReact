'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { AuthUser } from '@/types/knowly'
import AvatarPicker from '@/components/AvatarPicker'

export default function ParentSettingsPage() {
  const router = useRouter()
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  const [displayName, setDisplayName] = useState('')
  const [avatarIndex, setAvatarIndex] = useState(1)

  const [saving,  setSaving]  = useState(false)
  const [error,   setError]   = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((data: AuthUser) => {
        if (data.role !== 'parent') { router.push('/profiles'); return }
        setUser(data)
        setDisplayName(data.display_name ?? '')
        setAvatarIndex(data.avatar_index ?? 1)
      })
      .catch(() => router.push('/login'))
      .finally(() => setLoading(false))
  }, [router])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    setSuccess('')

    try {
      const res = await fetch('/api/auth/parent/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          display_name: displayName.trim(),
          avatar_index: avatarIndex,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.message ?? 'Failed to save.')
      } else {
        setUser(data)
        setSuccess('Profile updated.')
        window.dispatchEvent(new CustomEvent('knowly:profile-update', {
          detail: { avatar_index: avatarIndex, display_name: displayName.trim() },
        }))
      }
    } catch {
      setError('Something went wrong.')
    } finally {
      setSaving(false)
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

  return (
    <div className="flex flex-col gap-6 max-w-2xl mx-auto w-full">

      <h1 className="text-3xl font-bold">Settings</h1>

      <form onSubmit={handleSave} className="flex flex-col gap-6">

        {/* ── Profile Picture ── */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <p className="font-semibold text-base">Profile Picture</p>
            <div className="flex-1 h-px bg-base-200" />
          </div>
          <AvatarPicker type="adults" selected={avatarIndex} onSelect={setAvatarIndex} />
        </div>

        {/* ── Account Info ── */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <p className="font-semibold text-base">Account</p>
            <div className="flex-1 h-px bg-base-200" />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-base-content/60">Display Name</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="input input-bordered input-sm w-full"
              placeholder="How your name appears in the app"
            />
          </div>
        </div>

        {error   && <p className="text-error text-sm">{error}</p>}
        {success && <p className="text-success text-sm">{success}</p>}

        <button
          type="submit"
          disabled={saving}
          className="btn btn-primary w-full"
        >
          {saving ? <span className="loading loading-spinner loading-sm" /> : 'Save Changes'}
        </button>

      </form>
    </div>
  )
}
