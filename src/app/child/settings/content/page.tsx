'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Breadcrumb from '@/components/child/Breadcrumb'
import type { AuthUser } from '@/types/knowly'

const LEVELS = [
  { value: 'std_4', label: 'Standard 4' },
  { value: 'std_5', label: 'Standard 5' },
]

const PERIODS: Record<string, { value: string; label: string }[]> = {
  std_4: [
    { value: 'term_1', label: 'Term 1' },
    { value: 'term_2', label: 'Term 2' },
    { value: 'term_3', label: 'Term 3' },
  ],
  std_5: [
    { value: 'term_1', label: 'Term 1' },
    { value: 'term_2', label: 'Term 2' },
    { value: 'term_3', label: 'Term 3' },
  ],
}

export default function ContentSettingsPage() {
  const router = useRouter()
  const [level, setLevel] = useState('')
  const [period, setPeriod] = useState('')
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
        setLevel(active.level ?? 'std_4')
        setPeriod(active.period ?? 'term_1')
      } catch {
        setError('Failed to load profile.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [router])

  // Reset period when level changes if current period doesn't exist in new level
  function handleLevelChange(newLevel: string) {
    setLevel(newLevel)
    const validPeriods = PERIODS[newLevel] ?? []
    if (!validPeriods.find((p) => p.value === period)) {
      setPeriod(validPeriods[0]?.value ?? '')
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    setSaved(false)
    try {
      const res = await fetch('/api/children/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ level, period }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.message ?? 'Save failed'); return }
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
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

  const periods = PERIODS[level] ?? []

  return (
    <div className="flex flex-col gap-4 pb-8">
      <div className="flex items-center gap-3">
        <Link href="/child/settings" className="btn btn-circle btn-sm btn-ghost border border-base-300">‹</Link>
        <Breadcrumb crumbs={[
          { label: 'Home', href: '/child/home' },
          { label: 'Settings', href: '/child/settings' },
          { label: 'Content' },
        ]} />
      </div>

      <div>
        <h1 className="text-2xl font-bold">Content Settings</h1>
        <p className="text-base-content/60 text-sm mt-0.5">Choose your curriculum level and term</p>
      </div>

      <form onSubmit={handleSave} className="flex flex-col gap-4">
        <div className="card bg-base-200 rounded-2xl p-4 flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-base-content/60 uppercase tracking-wide">Level</label>
            <div className="flex flex-col gap-2">
              {LEVELS.map((l) => (
                <button
                  key={l.value}
                  type="button"
                  onClick={() => handleLevelChange(l.value)}
                  className={`flex items-center justify-between p-4 rounded-xl border-2 text-left transition-colors ${
                    level === l.value
                      ? 'border-primary bg-primary/10'
                      : 'border-base-300 bg-base-100 hover:bg-base-200'
                  }`}
                >
                  <span className="font-medium">{l.label}</span>
                  {level === l.value && (
                    <span className="text-primary font-bold text-lg">✓</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="divider my-0" />

          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-base-content/60 uppercase tracking-wide">Term</label>
            <div className="flex flex-col gap-2">
              {periods.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => setPeriod(p.value)}
                  className={`flex items-center justify-between p-4 rounded-xl border-2 text-left transition-colors ${
                    period === p.value
                      ? 'border-primary bg-primary/10'
                      : 'border-base-300 bg-base-100 hover:bg-base-200'
                  }`}
                >
                  <span className="font-medium">{p.label}</span>
                  {period === p.value && (
                    <span className="text-primary font-bold text-lg">✓</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="card bg-base-200 rounded-2xl p-4">
          <p className="text-xs text-base-content/60 leading-relaxed">
            Your content level determines which curriculum topics, trials, and quests are available to you.
            Changes take effect immediately on your next trial or quest.
          </p>
        </div>

        {error && <div className="alert alert-error text-sm py-2"><span>{error}</span></div>}
        {saved && <div className="alert alert-success text-sm py-2"><span>Content settings saved!</span></div>}

        <button type="submit" className="btn btn-neutral btn-lg w-full" disabled={saving}>
          {saving ? <span className="loading loading-spinner loading-sm" /> : 'Save Changes'}
        </button>
      </form>
    </div>
  )
}
