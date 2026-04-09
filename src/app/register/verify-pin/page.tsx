'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import PinInput from '@/components/PinInput'

export default function VerifyPinPage() {
  const router = useRouter()
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (pin.length !== 4) { setError('Please enter your 4-digit PIN'); return }

    setLoading(true)
    try {
      const res = await fetch('/api/auth/pin/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.message ?? 'Incorrect PIN')
        setPin('')
        return
      }

      router.push('/parent-profile')
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
          <h1 className="text-4xl font-bold">Knowley</h1>
          <p className="text-base-content/60 mt-1">Enter your PIN</p>
        </div>

        <form onSubmit={handleSubmit} className="w-full flex flex-col items-center gap-6">
          <PinInput value={pin} onChange={setPin} label="Secret Pin" />

          {error && (
            <div className="alert alert-error py-2 text-sm w-full">
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            className="btn btn-neutral btn-lg w-full"
            disabled={loading || pin.length !== 4}
          >
            {loading ? <span className="loading loading-spinner loading-sm" /> : 'Continue'}
          </button>

          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => router.push('/profiles')}
          >
            Back to Profiles
          </button>
        </form>
      </div>
    </main>
  )
}
