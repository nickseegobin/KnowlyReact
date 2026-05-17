'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Users, ChevronRight, Plus } from 'lucide-react'
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
    <div className="flex flex-col gap-6 max-w-2xl mx-auto w-full">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Classes</h1>
          <p className="text-base-content/50">Manage your classes and students</p>
        </div>
        <button
          onClick={() => { setShowForm((v) => !v); setCreateError('') }}
          className="btn btn-primary btn-sm shrink-0"
        >
          {showForm ? 'Cancel' : (
            <>
              <Plus size={14} />
              New Class
            </>
          )}
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

      {/* ── Section divider ── */}
      <div className="flex items-center gap-3">
        <p className="font-semibold text-base">Your Classes</p>
        <div className="flex-1 h-px bg-base-200" />
      </div>

      {/* ── Class list ── */}
      {loading ? (
        <div className="flex justify-center py-16">
          <span className="loading loading-spinner loading-md" />
        </div>
      ) : classes.length === 0 ? (
        <div className="bg-base-200 rounded-2xl p-8 flex flex-col items-center gap-3 text-center">
          <Users size={32} className="text-base-content/30" />
          <p className="font-semibold text-sm">No classes yet</p>
          <p className="text-xs text-base-content/50">Create your first class to get started.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {classes.map((cls) => (
            <Link
              key={cls.id}
              href={`/teacher/classes/${cls.id}`}
              className="flex items-center gap-3 p-3 rounded-2xl bg-base-200 hover:bg-base-300 transition-colors group"
            >
              <div className="w-10 h-10 rounded-xl bg-success/10 text-success flex items-center justify-center shrink-0">
                <Users size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm">{cls.name}</p>
                <p className="text-xs text-base-content/50">
                  {levelLabel(cls.level)}
                  {cls.member_count != null ? ` · ${cls.member_count} student${cls.member_count !== 1 ? 's' : ''}` : ''}
                </p>
              </div>
              <ChevronRight size={16} className="text-base-content/30 group-hover:text-base-content/60 transition-colors shrink-0" />
            </Link>
          ))}
        </div>
      )}

    </div>
  )
}
