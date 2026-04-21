'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { ClassEntry } from '@/types/knowly'
import { LEVELS } from '@/types/knowly'

export default function TeacherClassesPage() {
  const router = useRouter()
  const [classes, setClasses] = useState<ClassEntry[]>([])
  const [loading, setLoading] = useState(true)

  // Create form
  const [showForm, setShowForm]       = useState(false)
  const [name, setName]               = useState('')
  const [level, setLevel]             = useState('std_4')
  const [creating, setCreating]       = useState(false)
  const [createError, setCreateError] = useState('')

  const fetchClasses = useCallback(async () => {
    try {
      const res = await fetch('/api/classes')
      if (res.ok) {
        const data = await res.json()
        setClasses(data.classes ?? data ?? [])
      }
    } catch { /* keep current */ }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchClasses() }, [fetchClasses])

  async function createClass() {
    if (!name.trim()) { setCreateError('Class name is required.'); return }
    setCreating(true)
    setCreateError('')
    try {
      const res = await fetch('/api/classes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), level }),
      })
      const data = await res.json()
      if (!res.ok) {
        setCreateError(data.message ?? 'Failed to create class.')
      } else {
        setName('')
        setShowForm(false)
        fetchClasses()
      }
    } catch { setCreateError('Something went wrong.') }
    finally { setCreating(false) }
  }

  function levelLabel(v?: string) {
    return LEVELS.find((l) => l.value === v)?.label ?? v ?? ''
  }

  return (
    <div className="max-w-sm mx-auto w-full px-4 py-6 flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <button onClick={() => router.push('/teacher/home')} className="text-base-content/50 hover:text-base-content">
          ←
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Classes</h1>
          <p className="text-sm text-base-content/50">Manage your classes and students</p>
        </div>
        <button
          onClick={() => { setShowForm((v) => !v); setCreateError('') }}
          className="btn btn-sm btn-neutral"
        >
          {showForm ? 'Cancel' : '+ New Class'}
        </button>
      </div>

      {/* ── Create form ── */}
      {showForm && (
        <div className="bg-base-200 rounded-2xl p-4 flex flex-col gap-3">
          <p className="font-semibold text-sm">New Class</p>
          <input
            type="text"
            placeholder="Class name (e.g. Standard 4B)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && createClass()}
            className="input input-bordered input-sm w-full"
          />
          <select
            value={level}
            onChange={(e) => setLevel(e.target.value)}
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

      {/* ── Class list ── */}
      {loading ? (
        <div className="flex justify-center py-8">
          <span className="loading loading-spinner loading-md" />
        </div>
      ) : classes.length === 0 ? (
        <div className="bg-base-200 rounded-2xl p-8 text-center text-sm text-base-content/50">
          No classes yet. Create your first class above.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {classes.map((cls) => (
            <button
              key={cls.id}
              onClick={() => router.push(`/teacher/classes/${cls.id}`)}
              className="bg-base-200 hover:bg-base-300 transition-colors rounded-2xl p-4 flex items-center justify-between text-left"
            >
              <div>
                <p className="font-semibold">{cls.name}</p>
                <p className="text-sm text-base-content/50">
                  {levelLabel(cls.level)}
                  {cls.member_count != null ? ` · ${cls.member_count} student${cls.member_count !== 1 ? 's' : ''}` : ''}
                </p>
              </div>
              <span className="text-base-content/30">›</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
