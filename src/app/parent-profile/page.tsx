'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import type { AuthUser, ChildProfile } from '@/types/knowly'

export default function ParentProfilePage() {
  const router = useRouter()
  const [user, setUser]           = useState<AuthUser | null>(null)
  const [loading, setLoading]     = useState(true)
  const [gemBalance, setGemBalance] = useState(0)

  const [amounts,  setAmounts]  = useState<Record<number, number>>({})
  const [sending,  setSending]  = useState<Record<number, boolean>>({})
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
        const newBalance = data.parent_balance_after ?? data.balance_after ?? gemBalance - amount
        setGemBalance(newBalance)
        window.dispatchEvent(new CustomEvent('knowly:gem-update', { detail: { balance: newBalance } }))
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
      <div className="flex items-center justify-center py-16">
        <span className="loading loading-spinner loading-lg" />
      </div>
    )
  }

  if (!user) return null

  const avatarIndex = user.avatar_index ?? 1
  const children    = user.children ?? []

  return (
    <div className="max-w-sm mx-auto w-full flex flex-col gap-8 py-4">

      {/* ── Avatar + name ── */}
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

      {/* ── Quick links ── */}
      <Link
        href="/parent-profile/analytics"
        className="flex items-center justify-between bg-base-200 rounded-2xl px-4 py-3 hover:bg-base-300 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-2xl">📊</span>
          <div>
            <p className="font-semibold text-sm">Progress Report</p>
            <p className="text-xs text-base-content/50">See how your child is doing</p>
          </div>
        </div>
        <span className="text-base-content/30 text-lg">›</span>
      </Link>

      {/* ── Assign Gems ── */}
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
            const fb        = feedback[child.child_id]
            const level     = child.level === 'std_4' ? 'Standard 4' : child.level === 'std_5' ? 'Standard 5' : child.level
            const period    = child.period
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
                  <Image src="/icons/blue-gem.png" alt="gems" width={16} height={16} className="shrink-0" />
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
    </div>
  )
}
