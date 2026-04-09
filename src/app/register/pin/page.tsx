'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import PinInput from '@/components/PinInput'

export default function PinPage() {
  const router = useRouter()
  const [pin, setPin] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (pin.length !== 4) { setError('PIN must be 4 digits'); return }
    if (pin !== confirm) { setError('PINs do not match'); return }

    setLoading(true)
    try {
      const res = await fetch('/api/auth/pin/set', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      })

      const data = await res.json()
      if (!res.ok) { setError(data.message ?? 'Failed to set PIN'); return }

      // PIN set — parent now goes to add their first child
      router.push('/register/add-child')
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-base-100 px-4">
      <div className="w-full max-w-sm flex flex-col items-center gap-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold">Sign up</h1>
          <p className="text-base-content/60 mt-1">Secret Pin</p>
        </div>

        <form onSubmit={handleSubmit} className="w-full flex flex-col items-center gap-8">
          <PinInput value={pin} onChange={setPin} label="Set Secret Pin" />
          <PinInput value={confirm} onChange={setConfirm} label="Confirm Secret Pin" />

          {error && (
            <div className="alert alert-error py-2 text-sm w-full">
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            className="btn btn-neutral btn-lg w-full"
            disabled={loading || pin.length !== 4 || confirm.length !== 4}
          >
            {loading ? <span className="loading loading-spinner loading-sm" /> : 'Confirm'}
          </button>
        </form>
      </div>
    </main>
  )
}
