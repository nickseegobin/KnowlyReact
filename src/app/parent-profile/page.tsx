'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import type { AuthUser, ChildProfile } from '@/types/knowly'

export default function ParentProfilePage() {
  const router = useRouter()
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [gemBalance, setGemBalance] = useState(0)

  // Gem assignment state per child
  const [amounts, setAmounts] = useState<Record<number, number>>({})
  const [sending, setSending] = useState<Record<number, boolean>>({})
  const [feedback, setFeedback] = useState<Record<number, { ok: boolean; msg: string }>>({})

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((data: AuthUser) => {
        setUser(data)
        setGemBalance(data.gem_balance ?? 0)
      })
      .catch(() => router.push('/login'))
      .finally(() => setLoading(false))
  }, [router])

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/')
  }

  async function assignGems(child: ChildProfile) {
    const amount = amounts[child.child_id] ?? 0
    if (amount <= 0) {
      setFeedback((f) => ({ ...f, [child.child_id]: { ok: false, msg: 'Enter a valid amount.' } }))
      return
    }
    setSending((s) => ({ ...s, [child.child_id]: true }))
    setFeedback((f) => ({ ...f, [child.child_id]: { ok: true, msg: '' } }))

    try {
      const res = await fetch('/api/gems/allocate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ child_id: child.child_id, amount }),
      })
      const data = await res.json()
      if (!res.ok) {
        setFeedback((f) => ({ ...f, [child.child_id]: { ok: false, msg: data.message ?? 'Failed.' } }))
      } else {
        setGemBalance(data.parent_balance_after ?? data.balance_after ?? gemBalance - amount)
        setAmounts((a) => ({ ...a, [child.child_id]: 0 }))
        setFeedback((f) => ({ ...f, [child.child_id]: { ok: true, msg: `Sent ${amount} gem${amount !== 1 ? 's' : ''}!` } }))
      }
    } catch {
      setFeedback((f) => ({ ...f, [child.child_id]: { ok: false, msg: 'Something went wrong.' } }))
    } finally {
      setSending((s) => ({ ...s, [child.child_id]: false }))
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

  const avatarIndex = user.avatar_index ?? 1
  const children = user.children ?? []

  return (
    <main className="min-h-screen bg-base-100 flex flex-col">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 bg-base-100 border-b border-base-200 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full overflow-hidden border border-base-300">
            <Image
              src={`/avatars/adults/avatar-${avatarIndex}.png`}
              alt={user.display_name}
              width={32}
              height={32}
              className="object-cover w-full h-full"
            />
          </div>
          <span className="font-semibold text-sm">{user.display_name}</span>
        </div>

        {/* Blue gem wallet */}
        <div className="flex items-center gap-1.5 bg-blue-50 border border-blue-200 rounded-full px-3 py-1">
          <Image src="/icons/blue-gem.png" alt="Blue gems" width={18} height={18} />
          <span className="font-bold text-blue-700 text-sm">{gemBalance}</span>
        </div>
      </header>

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
            <p className="text-sm text-base-content/50">Parent Account</p>
          </div>
        </div>

        {/* ── Assign Gems ─────────────────────────────────────────────────── */}
        <section className="flex flex-col gap-3">
          <div>
            <h2 className="text-lg font-bold">Assign Gems</h2>
            <p className="text-sm text-base-content/50">Send Blue Gems from your wallet to a child</p>
          </div>

          {children.length === 0 ? (
            <div className="bg-base-200 rounded-2xl p-6 text-center text-sm text-base-content/50">
              No children added yet.{' '}
              <button onClick={() => router.push('/register/add-child')} className="link">Add a child</button>
            </div>
          ) : (
            children.map((child) => {
              const isSending = sending[child.child_id] ?? false
              const fb = feedback[child.child_id]
              const level = child.level === 'std_4' ? 'Standard 4' : child.level === 'std_5' ? 'Standard 5' : child.level
              const period = child.period
                ? { term_1: 'Term 1', term_2: 'Term 2', term_3: 'Term 3' }[child.period] ?? child.period
                : 'SEA'

              return (
                <div key={child.child_id} className="bg-base-200 rounded-2xl p-4 flex flex-col gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-base-300 shrink-0">
                      <Image
                        src={`/avatars/children/avatar-${child.avatar_index ?? 1}.png`}
                        alt={child.display_name}
                        width={40}
                        height={40}
                        className="object-cover w-full h-full"
                      />
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{child.display_name}</p>
                      <p className="text-xs text-base-content/50">{level} · {period}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 shrink-0">
                      <Image src="/icons/blue-gem.png" alt="gems" width={16} height={16} />
                    </div>
                    <input
                      type="number"
                      min={1}
                      max={gemBalance}
                      value={amounts[child.child_id] ?? ''}
                      onChange={(e) => setAmounts((a) => ({ ...a, [child.child_id]: parseInt(e.target.value) || 0 }))}
                      placeholder="Amount"
                      className="input input-sm input-bordered flex-1"
                    />
                    <button
                      onClick={() => assignGems(child)}
                      disabled={isSending}
                      className="btn btn-sm btn-neutral"
                    >
                      {isSending ? <span className="loading loading-spinner loading-xs" /> : 'Send'}
                    </button>
                  </div>

                  {fb?.msg && (
                    <p className={`text-xs ${fb.ok ? 'text-success' : 'text-error'}`}>{fb.msg}</p>
                  )}
                </div>
              )
            })
          )}
        </section>

        {/* ── Actions ─────────────────────────────────────────────────────── */}
        <div className="flex flex-col gap-3">
          <button
            onClick={() => router.push('/profiles')}
            className="btn btn-ghost btn-lg w-full border border-base-300"
          >
            Switch Account
          </button>
          <button
            onClick={handleLogout}
            className="btn btn-neutral btn-lg w-full"
          >
            Logout
          </button>
        </div>
      </div>
    </main>
  )
}
