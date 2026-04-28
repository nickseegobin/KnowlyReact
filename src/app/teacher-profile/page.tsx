'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import type { TeacherProfile, ClassEntry } from '@/types/knowly'
import { LEVELS } from '@/types/knowly'
import TeacherLayout from '@/components/teacher/TeacherLayout'

export default function TeacherProfilePage() {
  const router = useRouter()
  const [user, setUser] = useState<TeacherProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [classes, setClasses] = useState<ClassEntry[]>([])

  // Create class form
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newClassName, setNewClassName] = useState('')
  const [newClassLevel, setNewClassLevel] = useState('std_4')
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState('')

  // Invite student
  const [inviteClassId, setInviteClassId] = useState<number | null>(null)
  const [inviteNickname, setInviteNickname] = useState('')
  const [inviting, setInviting] = useState(false)
  const [inviteMsg, setInviteMsg] = useState<{ ok: boolean; text: string } | null>(null)

  const fetchClasses = useCallback(async () => {
    try {
      const res = await fetch('/api/classes')
      if (res.ok) {
        const data = await res.json()
        setClasses(Array.isArray(data) ? data : (data.classes ?? data.data ?? []))
      }
    } catch { /* leave empty */ }
  }, [])

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((data: TeacherProfile) => {
        if (data.role !== 'teacher') { router.push('/profiles'); return }
        setUser(data)
      })
      .catch(() => router.push('/login'))
      .finally(() => setLoading(false))

    fetchClasses()
  }, [router, fetchClasses])

  async function createClass() {
    if (!newClassName.trim()) { setCreateError('Class name is required.'); return }
    setCreating(true)
    setCreateError('')
    try {
      const res = await fetch('/api/classes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newClassName.trim(), level: newClassLevel }),
      })
      const data = await res.json()
      if (!res.ok) {
        setCreateError(data.message ?? 'Failed to create class.')
      } else {
        setNewClassName('')
        setShowCreateForm(false)
        fetchClasses()
      }
    } catch {
      setCreateError('Something went wrong.')
    } finally {
      setCreating(false)
    }
  }

  async function inviteStudent(classId: number) {
    if (!inviteNickname.trim()) return
    setInviting(true)
    setInviteMsg(null)
    try {
      const res = await fetch(`/api/classes/${classId}/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ child_nickname: inviteNickname.trim() }),
      })
      const data = await res.json()
      if (!res.ok) {
        setInviteMsg({ ok: false, text: data.message ?? 'Student not found.' })
      } else {
        setInviteMsg({ ok: true, text: `${inviteNickname} added to class!` })
        setInviteNickname('')
        fetchClasses()
      }
    } catch {
      setInviteMsg({ ok: false, text: 'Something went wrong.' })
    } finally {
      setInviting(false)
    }
  }

  function levelLabel(level?: string) {
    return LEVELS.find((l) => l.value === level)?.label ?? level ?? ''
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <span className="loading loading-spinner loading-lg" />
      </main>
    )
  }

  if (!user) return null

  const avatarIndex = user.avatar_index ?? 1

  return (
    <TeacherLayout user={user}>
      <div className="flex-1 overflow-y-auto px-4 py-6 max-w-sm mx-auto w-full flex flex-col gap-8">
        {/* ── Avatar + name ───────────────────────────────────────────────── */}
        <div className="flex flex-col items-center gap-3">
          <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-base-300">
            <Image
              src={`/avatars/adults/avatar-${avatarIndex}.png`}
              alt={user.display_name}
              width={96}
              height={96}
              className="object-cover w-full h-full"
            />
          </div>
          <div className="text-center">
            <p className="text-xl font-bold">{user.display_name}</p>
            <p className="text-sm text-base-content/50">
              {user.school_name ? `${user.school_name} · ` : ''}Teacher
            </p>
          </div>
        </div>

        {/* ── My Classes ──────────────────────────────────────────────────── */}
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold">My Classes</h2>
              <p className="text-sm text-base-content/50">Manage your classes and students</p>
            </div>
            <button
              onClick={() => { setShowCreateForm((v) => !v); setCreateError('') }}
              className="btn btn-sm btn-neutral"
            >
              {showCreateForm ? 'Cancel' : '+ New Class'}
            </button>
          </div>

          {/* Create class form */}
          {showCreateForm && (
            <div className="bg-base-200 rounded-2xl p-4 flex flex-col gap-3">
              <p className="font-semibold text-sm">New Class</p>
              <input
                type="text"
                placeholder="Class name (e.g. 4B Mathematics)"
                value={newClassName}
                onChange={(e) => setNewClassName(e.target.value)}
                className="input input-bordered input-sm w-full"
              />
              <select
                value={newClassLevel}
                onChange={(e) => setNewClassLevel(e.target.value)}
                className="select select-bordered select-sm w-full"
              >
                {LEVELS.map((l) => (
                  <option key={l.value} value={l.value}>{l.label}</option>
                ))}
              </select>
              {createError && <p className="text-error text-xs">{createError}</p>}
              <button
                onClick={createClass}
                disabled={creating}
                className="btn btn-sm btn-neutral w-full"
              >
                {creating ? <span className="loading loading-spinner loading-xs" /> : 'Create Class'}
              </button>
            </div>
          )}

          {/* Class list */}
          {classes.length === 0 ? (
            <div className="bg-base-200 rounded-2xl p-6 text-center text-sm text-base-content/50">
              No classes yet. Create your first class above.
            </div>
          ) : (
            classes.map((cls) => (
              <div key={cls.id} className="bg-base-200 rounded-2xl p-4 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-sm">{cls.name}</p>
                    <p className="text-xs text-base-content/50">
                      {cls.level ? levelLabel(cls.level) : ''}
                      {cls.member_count != null ? ` · ${cls.member_count} student${cls.member_count !== 1 ? 's' : ''}` : ''}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setInviteClassId(inviteClassId === cls.id ? null : cls.id)
                      setInviteNickname('')
                      setInviteMsg(null)
                    }}
                    className="btn btn-xs btn-ghost border border-base-300"
                  >
                    {inviteClassId === cls.id ? 'Close' : '+ Student'}
                  </button>
                </div>

                {/* Invite student panel */}
                {inviteClassId === cls.id && (
                  <div className="flex flex-col gap-2 border-t border-base-300 pt-3">
                    <p className="text-xs font-semibold text-base-content/70">Add student by nickname</p>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="e.g. TurboConch42"
                        value={inviteNickname}
                        onChange={(e) => setInviteNickname(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && inviteStudent(cls.id)}
                        className="input input-bordered input-xs flex-1"
                      />
                      <button
                        onClick={() => inviteStudent(cls.id)}
                        disabled={inviting || !inviteNickname.trim()}
                        className="btn btn-xs btn-neutral"
                      >
                        {inviting ? <span className="loading loading-spinner loading-xs" /> : 'Add'}
                      </button>
                    </div>
                    {inviteMsg && (
                      <p className={`text-xs ${inviteMsg.ok ? 'text-success' : 'text-error'}`}>
                        {inviteMsg.text}
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </section>

      </div>
    </TeacherLayout>
  )
}
