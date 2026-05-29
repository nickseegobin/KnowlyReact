'use client'

import { Suspense, useState } from 'react'
import Link from 'next/link'

function ForgotPasswordForm() {
  const [email,   setEmail]   = useState('')
  const [sent,    setSent]    = useState(false)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      const data = await res.json()
      if (!res.ok) {
        setError(data.message ?? 'Something went wrong. Please try again.')
        return
      }

      setSent(true)
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <div className="flex flex-col items-center gap-4 text-center w-full">
        <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
        <div>
          <p className="font-semibold text-lg">Check your email</p>
          <p className="text-base-content/60 text-sm mt-1">
            If <span className="font-medium text-base-content">{email}</span> is registered,
            a password reset link has been sent.
          </p>
        </div>
        <Link href="/login" className="btn btn-ghost btn-sm mt-2">
          Back to Login
        </Link>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="w-full flex flex-col gap-3">
      <p className="text-sm text-base-content/60 text-center">
        Enter your email and we&apos;ll send you a reset link.
      </p>

      <input
        type="email"
        placeholder="Email"
        className="input input-bordered w-full"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        autoComplete="email"
        required
      />

      {error && (
        <div className="alert alert-error py-2 text-sm">
          <span>{error}</span>
        </div>
      )}

      <button
        type="submit"
        className="btn btn-neutral btn-lg w-full mt-2"
        disabled={loading}
      >
        {loading ? <span className="loading loading-spinner loading-sm" /> : 'Send Reset Link'}
      </button>
    </form>
  )
}

export default function ForgotPasswordPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-base-100 px-4">
      <div className="w-full max-w-sm flex flex-col items-center gap-6">
        <div className="text-center">
          <h1 className="text-5xl font-bold">Knowley</h1>
          <p className="text-base-content/60 mt-1">Reset your password</p>
        </div>

        <Suspense fallback={<div className="skeleton h-12 w-full" />}>
          <ForgotPasswordForm />
        </Suspense>

        <Link href="/login" className="text-sm text-base-content/50 hover:text-base-content transition-colors">
          Back to Login
        </Link>
      </div>
    </main>
  )
}
