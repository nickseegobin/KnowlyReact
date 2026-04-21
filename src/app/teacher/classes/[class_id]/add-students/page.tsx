'use client'

import { useRef, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { LEVELS } from '@/types/knowly'

interface ChildResult {
  child_id: number
  nickname: string
  first_name: string
  last_name: string
  level: string | null
}

function levelLabel(v?: string | null) {
  return LEVELS.find((l) => l.value === v)?.label ?? v ?? ''
}

export default function AddStudentsPage() {
  const router = useRouter()
  const params = useParams()
  const classId = params.class_id as string

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName]   = useState('')
  const [nickname, setNickname]   = useState('')

  const [results, setResults]     = useState<ChildResult[]>([])
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState('')
  const [hasSearched, setHasSearched] = useState(false)

  const [inviting, setInviting]     = useState<number | null>(null)
  const [invited, setInvited]       = useState<Set<number>>(new Set())
  const [inviteError, setInviteError] = useState('')

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function isReady(fn: string, ln: string, nn: string) {
    return fn.trim().length >= 2 || ln.trim().length >= 2 || nn.trim().length >= 2
  }

  function scheduleSearch(fn: string, ln: string, nn: string) {
    setSearchError('')
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!isReady(fn, ln, nn)) { setResults([]); setHasSearched(false); return }
    debounceRef.current = setTimeout(() => runSearch(fn.trim(), ln.trim(), nn.trim()), 400)
  }

  function handleFirstName(val: string) { setFirstName(val); scheduleSearch(val, lastName, nickname) }
  function handleLastName(val: string)  { setLastName(val);  scheduleSearch(firstName, val, nickname) }
  function handleNickname(val: string)  { setNickname(val);  scheduleSearch(firstName, lastName, val) }

  async function runSearch(fn: string, ln: string, nn: string) {
    setSearching(true)
    setHasSearched(true)
    try {
      const qs = new URLSearchParams()
      if (nn.length >= 2) qs.set('q',          nn)
      if (fn.length >= 2) qs.set('first_name', fn)
      if (ln.length >= 2) qs.set('last_name',  ln)

      const res = await fetch(`/api/classes/child-lookup?${qs}`)
      const data = await res.json()
      if (!res.ok) {
        setSearchError(data.message ?? 'Search failed.')
        setResults([])
      } else {
        setResults(data.results ?? data ?? [])
      }
    } catch {
      setSearchError('Search failed.')
    } finally {
      setSearching(false)
    }
  }

  async function invite(child: ChildResult) {
    setInviting(child.child_id)
    setInviteError('')
    try {
      const res = await fetch(`/api/classes/${classId}/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ child_nickname: child.nickname }),
      })
      const data = await res.json()
      if (!res.ok) {
        setInviteError(data.message ?? 'Failed to invite student.')
      } else {
        setInvited((prev) => new Set(prev).add(child.child_id))
      }
    } catch {
      setInviteError('Something went wrong.')
    } finally {
      setInviting(null)
    }
  }

  const anyField = isReady(firstName, lastName, nickname)

  return (
    <div className="max-w-sm mx-auto w-full px-4 py-6 flex flex-col gap-6">
      {/* ── Header ── */}
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="text-base-content/50 hover:text-base-content">
          ←
        </button>
        <div>
          <h1 className="text-2xl font-bold">Add Students</h1>
          <p className="text-sm text-base-content/50">Search by name or nickname</p>
        </div>
      </div>

      {/* ── Search fields ── */}
      <div className="bg-base-200 rounded-2xl p-4 flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-2">
          <input
            type="text"
            placeholder="First name"
            value={firstName}
            onChange={(e) => handleFirstName(e.target.value)}
            className="input input-bordered input-sm w-full"
            autoFocus
          />
          <input
            type="text"
            placeholder="Last name"
            value={lastName}
            onChange={(e) => handleLastName(e.target.value)}
            className="input input-bordered input-sm w-full"
          />
        </div>
        <input
          type="text"
          placeholder="Nickname"
          value={nickname}
          onChange={(e) => handleNickname(e.target.value)}
          className="input input-bordered input-sm w-full"
        />
        {!anyField && (
          <p className="text-xs text-base-content/50">
            Enter at least 2 characters in any field to search.
          </p>
        )}
        {searchError && <p className="text-error text-xs">{searchError}</p>}
      </div>

      {/* ── Results ── */}
      {searching && (
        <div className="flex justify-center py-4">
          <span className="loading loading-spinner loading-md" />
        </div>
      )}

      {!searching && hasSearched && results.length === 0 && !searchError && (
        <div className="bg-base-200 rounded-2xl p-6 text-center text-sm text-base-content/50">
          No students found.
        </div>
      )}

      {results.length > 0 && (
        <div className="flex flex-col gap-2">
          {results.map((child) => (
            <div
              key={child.child_id}
              className="bg-base-200 rounded-xl px-4 py-3 flex items-center justify-between"
            >
              <div>
                <p className="font-semibold text-sm">
                  {child.first_name || child.last_name
                    ? `${child.first_name} ${child.last_name}`.trim()
                    : child.nickname}
                </p>
                <p className="text-xs text-base-content/50">
                  {child.nickname}
                  {child.level ? ` · ${levelLabel(child.level)}` : ''}
                </p>
              </div>
              {invited.has(child.child_id) ? (
                <span className="text-xs text-success font-semibold">Invited ✓</span>
              ) : (
                <button
                  onClick={() => invite(child)}
                  disabled={inviting === child.child_id}
                  className="btn btn-xs btn-neutral"
                >
                  {inviting === child.child_id
                    ? <span className="loading loading-spinner loading-xs" />
                    : 'Invite'}
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {inviteError && <p className="text-error text-xs">{inviteError}</p>}

      <div className="bg-base-200 rounded-2xl p-4 text-xs text-base-content/50">
        <p className="font-semibold mb-1">How invitations work</p>
        <p>When you invite a student, both the student and their parent receive a notification. The student joins the class once the invitation is accepted.</p>
      </div>
    </div>
  )
}
