'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import AvatarPicker from '@/components/AvatarPicker'
import { LEVELS, PERIODS } from '@/types/knowly'

export default function AddChildPage() {
  const router = useRouter()
  const [avatarIndex, setAvatarIndex] = useState<number>(1)
  const [form, setForm] = useState({
    nickname: '',
    first_name: '',
    last_name: '',
    age: '',
    level: '',
    period: '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)

  function set(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  function handleLevelChange(value: string) {
    set('level', value)
    if (value === 'std_5') set('period', '')
  }

  async function fetchNickname() {
    setGenerating(true)
    try {
      const res = await fetch('/api/nickname/generate', { method: 'POST' })
      const data = await res.json()
      if (res.ok && data.nickname) set('nickname', data.nickname)
    } finally {
      setGenerating(false)
    }
  }

  // Auto-generate nickname on first load
  useEffect(() => {
    fetchNickname()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!form.level) { setError('Please select a Standard'); return }
    if (form.level !== 'std_5' && !form.period) { setError('Please select a Term'); return }

    setLoading(true)
    try {
      const res = await fetch('/api/children', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          first_name: form.first_name,
          last_name: form.last_name,
          nickname: form.nickname,
          level: form.level,
          period: form.level === 'std_5' ? '' : form.period,
          age: parseInt(form.age, 10),
          avatar_index: avatarIndex,
        }),
      })

      const data = await res.json()
      if (!res.ok) { setError(data.message ?? 'Failed to create child account'); return }

      router.push('/profiles')
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const isCapstone = form.level === 'std_5'

  return (
    <main className="min-h-screen flex items-center justify-center bg-base-100 px-4 py-12">
      <div className="w-full max-w-sm flex flex-col items-center gap-6">
        <div className="text-center">
          <h1 className="text-4xl font-bold">Sign up</h1>
          <p className="text-base-content/60 mt-1">Add Child</p>
        </div>

        <form onSubmit={handleSubmit} className="w-full flex flex-col gap-3">
          <div className="mb-2">
            <AvatarPicker type="children" selected={avatarIndex} onSelect={setAvatarIndex} />
          </div>

          {/* Nickname — read-only, auto-generated */}
          <div className="flex gap-2">
            <input
              type="text"
              className="input input-bordered flex-1 bg-base-200 cursor-default"
              value={form.nickname}
              readOnly
              placeholder="Generating..."
            />
            <button
              type="button"
              className="btn btn-neutral"
              onClick={fetchNickname}
              disabled={generating}
            >
              {generating ? <span className="loading loading-spinner loading-xs" /> : 'Generate'}
            </button>
          </div>

          <input
            type="text"
            placeholder="First Name"
            className="input input-bordered w-full"
            value={form.first_name}
            onChange={(e) => set('first_name', e.target.value)}
            required
          />
          <input
            type="text"
            placeholder="Last Name"
            className="input input-bordered w-full"
            value={form.last_name}
            onChange={(e) => set('last_name', e.target.value)}
            required
          />
          <input
            type="number"
            placeholder="Age"
            className="input input-bordered w-full"
            value={form.age}
            onChange={(e) => set('age', e.target.value)}
            min={5}
            max={18}
            required
          />

          <select
            className="select select-bordered w-full"
            value={form.level}
            onChange={(e) => handleLevelChange(e.target.value)}
            required
          >
            <option value="" disabled>Select Standard</option>
            {LEVELS.map((l) => (
              <option key={l.value} value={l.value}>{l.label}</option>
            ))}
          </select>

          {!isCapstone && (
            <select
              className="select select-bordered w-full"
              value={form.period}
              onChange={(e) => set('period', e.target.value)}
              required
            >
              <option value="" disabled>Select Term</option>
              {PERIODS.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          )}

          {isCapstone && (
            <div className="badge badge-neutral badge-outline py-3 px-4 text-xs">
              Standard 5 is a capstone level — no term required
            </div>
          )}

          {error && <div className="alert alert-error py-2 text-sm"><span>{error}</span></div>}

          <button type="submit" className="btn btn-neutral btn-lg w-full mt-2" disabled={loading || !form.nickname}>
            {loading ? <span className="loading loading-spinner loading-sm" /> : 'Create Account'}
          </button>
        </form>
      </div>
    </main>
  )
}
