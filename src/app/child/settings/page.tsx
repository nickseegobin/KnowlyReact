'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Breadcrumb from '@/components/child/Breadcrumb'
import AvatarPicker from '@/components/AvatarPicker'
import type { AuthUser, ChildProfile } from '@/types/knowly'

export default function ChildSettingsPage() {
  const router = useRouter()
  const [child, setChild] = useState<ChildProfile | null>(null)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [age, setAge] = useState<string>('')
  const [avatarIndex, setAvatarIndex] = useState(1)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)


  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/auth/me')
        if (!res.ok) { router.push('/login'); return }
        const user: AuthUser = await res.json()
        const active = user.children?.find((c) => c.child_id === user.active_child_id) ?? user.children?.[0]
        if (!active) { router.push('/child/home'); return }
        setChild(active)
        setFirstName(active.first_name ?? '')
        setLastName(active.last_name ?? '')
        setAge(active.age != null ? String(active.age) : '')
        setAvatarIndex(active.avatar_index ?? 1)
      } catch {
        setError('Failed to load profile.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [router])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    setSaved(false)
    try {
      const res = await fetch('/api/children/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          first_name: firstName,
          last_name: lastName,
          age: age ? parseInt(age, 10) : undefined,
          avatar_index: avatarIndex,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.message ?? 'Save failed'); return }
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
      window.dispatchEvent(new CustomEvent('knowly:profile-update', {
        detail: { avatar_index: avatarIndex, display_name: `${firstName} ${lastName}`.trim() },
      }))
    } catch {
      setError('Something went wrong.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <span className="loading loading-spinner loading-lg" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 pb-8">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="btn btn-circle btn-sm btn-ghost border border-base-300">‹</button>
        <Breadcrumb crumbs={[
          { label: 'Home', href: '/child/home' },
          { label: 'Settings' },
        ]} />
      </div>

      <div>
        <h1 className="text-2xl font-bold">My Settings</h1>
        <p className="text-base-content/60 text-sm mt-0.5">Update your name and profile</p>
      </div>

      {/* Avatar selector */}
      <div className="flex flex-col gap-2">
        <p className="text-xs font-semibold text-base-content/60 uppercase tracking-wide">Profile Picture</p>
        <AvatarPicker type="children" selected={avatarIndex} onSelect={setAvatarIndex} />
      </div>

      <form onSubmit={handleSave} className="flex flex-col gap-4">
        <div className="card bg-base-200 rounded-2xl p-4 flex flex-col gap-4">
          {/* Nickname read-only */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-base-content/60 uppercase tracking-wide">Nickname</label>
            <p className="text-base font-medium">@{child?.nickname}</p>
            <p className="text-xs text-base-content/40">Nickname cannot be changed</p>
          </div>

          <div className="divider my-0" />

          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-base-content/60 uppercase tracking-wide" htmlFor="first_name">First Name</label>
            <input
              id="first_name"
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="input input-bordered w-full"
              placeholder="First name"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-base-content/60 uppercase tracking-wide" htmlFor="last_name">Last Name</label>
            <input
              id="last_name"
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="input input-bordered w-full"
              placeholder="Last name"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-base-content/60 uppercase tracking-wide" htmlFor="age">Age</label>
            <input
              id="age"
              type="number"
              value={age}
              onChange={(e) => setAge(e.target.value)}
              className="input input-bordered w-full"
              placeholder="Age"
              min={3}
              max={18}
            />
          </div>
        </div>

        {error && <div className="alert alert-error text-sm py-2"><span>{error}</span></div>}
        {saved && <div className="alert alert-success text-sm py-2"><span>Settings saved!</span></div>}

        <button type="submit" className="btn btn-neutral btn-lg w-full" disabled={saving}>
          {saving ? <span className="loading loading-spinner loading-sm" /> : 'Save Changes'}
        </button>
      </form>

      <Link href="/child/settings/content" className="btn btn-outline w-full">
        Content Settings →
      </Link>
    </div>
  )
}
