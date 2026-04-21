'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import type { TeacherProfile } from '@/types/knowly'
import TeacherLayout from '@/components/teacher/TeacherLayout'

const AVATAR_COUNT = 10

export default function TeacherSettingsPage() {
  const router = useRouter()
  const [user, setUser] = useState<TeacherProfile | null>(null)
  const [loading, setLoading] = useState(true)

  // Form fields
  const [firstName, setFirstName]             = useState('')
  const [lastName, setLastName]               = useState('')
  const [schoolName, setSchoolName]           = useState('')
  const [className, setClassName]             = useState('')
  const [phone, setPhone]                     = useState('')
  const [principalName, setPrincipalName]     = useState('')
  const [principalContact, setPrincipalContact] = useState('')
  const [avatarIndex, setAvatarIndex]         = useState(1)

  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((data: TeacherProfile) => {
        if (data.role !== 'teacher') { router.push('/profiles'); return }
        setUser(data)
        setFirstName(data.first_name ?? '')
        setLastName(data.last_name ?? '')
        setSchoolName(data.school_name ?? '')
        setClassName(data.class_name ?? '')
        setPhone(data.phone ?? '')
        setPrincipalName(data.principal_name ?? '')
        setPrincipalContact(data.principal_contact ?? '')
        setAvatarIndex(data.avatar_index ?? 1)
      })
      .catch(() => router.push('/login'))
      .finally(() => setLoading(false))
  }, [router])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!firstName.trim() || !lastName.trim()) {
      setError('First and last name are required.')
      return
    }
    setSaving(true)
    setError('')
    setSuccess('')

    try {
      const res = await fetch('/api/auth/teacher/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          first_name:        firstName.trim(),
          last_name:         lastName.trim(),
          school_name:       schoolName.trim(),
          class_name:        className.trim(),
          phone:             phone.trim(),
          principal_name:    principalName.trim(),
          principal_contact: principalContact.trim(),
          avatar_index:      avatarIndex,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.message ?? 'Failed to save.')
      } else {
        setUser(data)
        setSuccess('Profile updated.')
      }
    } catch {
      setError('Something went wrong.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <span className="loading loading-spinner loading-lg" />
      </main>
    )
  }

  if (!user) return null

  return (
    <TeacherLayout user={{ ...user, avatar_index: avatarIndex }}>
      <div className="max-w-sm mx-auto w-full px-4 py-6 flex flex-col gap-6">
        {/* Back */}
        <Link href="/teacher-profile" className="text-sm text-base-content/50 hover:text-base-content flex items-center gap-1">
          ← Back
        </Link>

        <h1 className="text-2xl font-bold">Settings</h1>

        <form onSubmit={handleSave} className="flex flex-col gap-5">
          {/* ── Avatar picker ── */}
          <div className="flex flex-col gap-2">
            <p className="text-sm font-semibold">Avatar</p>
            <div className="grid grid-cols-5 gap-2">
              {Array.from({ length: AVATAR_COUNT }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setAvatarIndex(n)}
                  className={`rounded-full overflow-hidden border-4 transition-colors ${
                    avatarIndex === n ? 'border-neutral' : 'border-base-300 hover:border-base-content/30'
                  }`}
                >
                  <Image
                    src={`/avatars/adults/avatar-${n}.png`}
                    alt={`Avatar ${n}`}
                    width={52}
                    height={52}
                    className="object-cover w-full h-full"
                  />
                </button>
              ))}
            </div>
          </div>

          {/* ── Personal info ── */}
          <div className="flex flex-col gap-3">
            <p className="text-sm font-semibold">Personal Information</p>
            <div className="flex gap-2">
              <div className="flex flex-col gap-1 flex-1">
                <label className="text-xs text-base-content/60">First Name</label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="input input-bordered input-sm w-full"
                  required
                />
              </div>
              <div className="flex flex-col gap-1 flex-1">
                <label className="text-xs text-base-content/60">Last Name</label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="input input-bordered input-sm w-full"
                  required
                />
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-base-content/60">Phone</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. 868-555-0100"
                className="input input-bordered input-sm w-full"
              />
            </div>
          </div>

          {/* ── School info ── */}
          <div className="flex flex-col gap-3">
            <p className="text-sm font-semibold">School Information</p>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-base-content/60">School Name</label>
              <input
                type="text"
                value={schoolName}
                onChange={(e) => setSchoolName(e.target.value)}
                className="input input-bordered input-sm w-full"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-base-content/60">Class / Room</label>
              <input
                type="text"
                value={className}
                onChange={(e) => setClassName(e.target.value)}
                placeholder="e.g. 4B"
                className="input input-bordered input-sm w-full"
              />
            </div>
          </div>

          {/* ── Principal info ── */}
          <div className="flex flex-col gap-3">
            <p className="text-sm font-semibold">Principal Information</p>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-base-content/60">Principal Name</label>
              <input
                type="text"
                value={principalName}
                onChange={(e) => setPrincipalName(e.target.value)}
                className="input input-bordered input-sm w-full"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-base-content/60">Principal Contact</label>
              <input
                type="text"
                value={principalContact}
                onChange={(e) => setPrincipalContact(e.target.value)}
                placeholder="Email or phone"
                className="input input-bordered input-sm w-full"
              />
            </div>
          </div>

          {/* ── ID Document ── */}
          <div className="flex flex-col gap-2">
            <p className="text-sm font-semibold">ID Document</p>
            <div className="bg-base-200 rounded-xl p-4 text-sm text-base-content/50 text-center">
              Document upload coming soon.
            </div>
          </div>

          {/* Feedback */}
          {error   && <p className="text-error text-sm">{error}</p>}
          {success && <p className="text-success text-sm">{success}</p>}

          <button
            type="submit"
            disabled={saving}
            className="btn btn-neutral w-full"
          >
            {saving ? <span className="loading loading-spinner loading-sm" /> : 'Save Changes'}
          </button>
        </form>
      </div>
    </TeacherLayout>
  )
}
