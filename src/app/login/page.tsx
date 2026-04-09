'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function LoginPage() {
  const router = useRouter()
  const [form, setForm] = useState({ username: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.message ?? 'Login failed')
        return
      }

      // Route by role
      if (data.role === 'teacher') {
        router.push(
          data.approval_status === 'approved' ? '/teacher-profile' : '/waiting-approval'
        )
      } else {
        router.push('/profiles')
      }
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-base-100 px-4">
      <div className="w-full max-w-sm flex flex-col items-center gap-6">
        <div className="text-center">
          <h1 className="text-5xl font-bold">Knowley</h1>
          <p className="text-base-content/60 mt-1">Login</p>
        </div>

        <form onSubmit={handleSubmit} className="w-full flex flex-col gap-3">
          <input
            type="text"
            placeholder="Email"
            className="input input-bordered w-full"
            value={form.username}
            onChange={(e) => setForm({ ...form, username: e.target.value })}
            autoComplete="email"
            required
          />
          <input
            type="password"
            placeholder="Password"
            className="input input-bordered w-full"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            autoComplete="current-password"
            required
          />

          <div className="text-center">
            <Link href="/forgot-password" className="text-sm text-base-content/50 hover:text-base-content">
              Forgot Password?
            </Link>
          </div>

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
            {loading ? <span className="loading loading-spinner loading-sm" /> : 'Login'}
          </button>
        </form>

        <Link href="/register" className="btn btn-ghost btn-lg w-full border border-base-300">
          Create Account
        </Link>
      </div>
    </main>
  )
}
