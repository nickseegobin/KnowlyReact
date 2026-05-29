'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import AvatarPicker from '@/components/AvatarPicker'
import { LEVELS, PERIODS } from '@/types/knowly'

function AddChildForm() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const isSignup     = searchParams.get('signup') === '1'
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
      <div className="w-full max-w-sm flex flex-col gap-6">
        <div>
          <h1 className="text-3xl font-bold">{isSignup ? 'Add Your First Child' : 'Add Child'}</h1>
          <p className="text-base-content/60 mt-1 text-sm">Create a student account for your child</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">

          {/* Avatar */}
          <div className="flex flex-col gap-2">
            <p className="text-xs text-base-content/60 font-medium uppercase tracking-wide">Profile Picture</p>
            <AvatarPicker type="children" selected={avatarIndex} onSelect={setAvatarIndex} />
          </div>

          {/* Nickname */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-base-content/60">Nickname (auto-generated)</label>
            <div className="flex gap-2">
              <input
                type="text"
                className="input input-bordered input-sm flex-1 bg-base-200 cursor-default"
                value={form.nickname}
                readOnly
                placeholder="Generating..."
              />
              <button
                type="button"
                className="btn btn-sm btn-outline"
                onClick={fetchNickname}
                disabled={generating}
              >
                {generating ? <span className="loading loading-spinner loading-xs" /> : 'Regenerate'}
              </button>
            </div>
          </div>

          {/* Name + Age */}
          <div className="flex flex-col gap-3">
            <p className="text-xs text-base-content/60 font-medium uppercase tracking-wide">Child Details</p>
            <div className="flex gap-2">
              <div className="flex flex-col gap-1 flex-1">
                <label className="text-xs text-base-content/60">First Name</label>
                <input
                  type="text"
                  className="input input-bordered input-sm w-full"
                  value={form.first_name}
                  onChange={(e) => set('first_name', e.target.value)}
                  required
                />
              </div>
              <div className="flex flex-col gap-1 flex-1">
                <label className="text-xs text-base-content/60">Last Name</label>
                <input
                  type="text"
                  className="input input-bordered input-sm w-full"
                  value={form.last_name}
                  onChange={(e) => set('last_name', e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-base-content/60">Age</label>
              <input
                type="number"
                className="input input-bordered input-sm w-full"
                value={form.age}
                onChange={(e) => set('age', e.target.value)}
                min={5}
                max={18}
                required
              />
            </div>
          </div>

          {/* Curriculum */}
          <div className="flex flex-col gap-3">
            <p className="text-xs text-base-content/60 font-medium uppercase tracking-wide">Curriculum</p>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-base-content/60">Standard</label>
              <select
                className="select select-bordered select-sm w-full"
                value={form.level}
                onChange={(e) => handleLevelChange(e.target.value)}
                required
              >
                <option value="" disabled>Select Standard</option>
                {LEVELS.map((l) => (
                  <option key={l.value} value={l.value}>{l.label}</option>
                ))}
              </select>
            </div>

            {!isCapstone && (
              <div className="flex flex-col gap-1">
                <label className="text-xs text-base-content/60">Term</label>
                <select
                  className="select select-bordered select-sm w-full"
                  value={form.period}
                  onChange={(e) => set('period', e.target.value)}
                  required
                >
                  <option value="" disabled>Select Term</option>
                  {PERIODS.map((p) => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
              </div>
            )}

            {isCapstone && (
              <p className="text-xs text-base-content/50 bg-base-200 rounded-xl px-3 py-2">
                Standard 5 is a capstone level — no term required
              </p>
            )}
          </div>

          {error && <div className="alert alert-error py-2 text-sm"><span>{error}</span></div>}

          <button type="submit" className="btn btn-primary w-full" disabled={loading || !form.nickname}>
            {loading ? <span className="loading loading-spinner loading-sm" /> : 'Create Account'}
          </button>
        </form>
      </div>
    </main>
  )
}

export default function AddChildPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen flex items-center justify-center bg-base-100 px-4 py-12">
        <span className="loading loading-spinner loading-lg" />
      </main>
    }>
      <AddChildForm />
    </Suspense>
  )
}
