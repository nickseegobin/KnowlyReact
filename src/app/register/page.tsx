'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import AvatarPicker from '@/components/AvatarPicker'

type Tab = 'parent' | 'teacher'

// ── Parent Form ───────────────────────────────────────────────────────────────

function ParentForm() {
  const router = useRouter()
  const [avatarIndex, setAvatarIndex] = useState<number>(1)
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    password: '',
    confirm_password: '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  function set(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (form.password !== form.confirm_password) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/auth/register/parent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          first_name: form.first_name,
          last_name: form.last_name,
          email: form.email,
          password: form.password,
          avatar_index: avatarIndex ?? undefined,
        }),
      })

      const data = await res.json()
      if (!res.ok) { setError(data.message ?? 'Registration failed'); return }

      // Parent registered + JWT set — go set PIN
      router.push('/register/pin')
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 w-full">
      <div className="mb-2">
        <AvatarPicker type="adults" selected={avatarIndex} onSelect={setAvatarIndex} />
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
        type="email"
        placeholder="Email"
        className="input input-bordered w-full"
        value={form.email}
        onChange={(e) => set('email', e.target.value)}
        autoComplete="email"
        required
      />
      <input
        type="password"
        placeholder="Password"
        className="input input-bordered w-full"
        value={form.password}
        onChange={(e) => set('password', e.target.value)}
        autoComplete="new-password"
        required
      />
      <input
        type="password"
        placeholder="Confirm Password"
        className="input input-bordered w-full"
        value={form.confirm_password}
        onChange={(e) => set('confirm_password', e.target.value)}
        autoComplete="new-password"
        required
      />

      {error && <div className="alert alert-error py-2 text-sm"><span>{error}</span></div>}

      <button type="submit" className="btn btn-neutral btn-lg w-full mt-2" disabled={loading}>
        {loading ? <span className="loading loading-spinner loading-sm" /> : 'Create Account'}
      </button>
    </form>
  )
}

// ── Teacher Form ──────────────────────────────────────────────────────────────

function TeacherForm() {
  const router = useRouter()
  const [avatarIndex, setAvatarIndex] = useState<number>(1)
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    password: '',
    confirm_password: '',
    school_name: '',
    class_name: '',
    phone: '',
    principal_name: '',
    principal_contact: '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  function set(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (form.password !== form.confirm_password) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/auth/register/teacher', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          first_name: form.first_name,
          last_name: form.last_name,
          email: form.email,
          password: form.password,
          school_name: form.school_name,
          class_name: form.class_name,
          phone: form.phone,
          principal_name: form.principal_name,
          principal_contact: form.principal_contact,
        }),
      })

      const data = await res.json()
      if (!res.ok) { setError(data.message ?? 'Registration failed'); return }

      // Teacher account pending approval — no JWT
      router.push('/register/pending')
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 w-full">
      <div className="mb-2">
        <AvatarPicker type="adults" selected={avatarIndex} onSelect={setAvatarIndex} />
      </div>

      <input type="text" placeholder="First Name" className="input input-bordered w-full"
        value={form.first_name} onChange={(e) => set('first_name', e.target.value)} required />
      <input type="text" placeholder="Last Name" className="input input-bordered w-full"
        value={form.last_name} onChange={(e) => set('last_name', e.target.value)} required />
      <input type="email" placeholder="Email" className="input input-bordered w-full"
        value={form.email} onChange={(e) => set('email', e.target.value)} autoComplete="email" required />
      <input type="password" placeholder="Password" className="input input-bordered w-full"
        value={form.password} onChange={(e) => set('password', e.target.value)} autoComplete="new-password" required />
      <input type="password" placeholder="Confirm Password" className="input input-bordered w-full"
        value={form.confirm_password} onChange={(e) => set('confirm_password', e.target.value)} required />

      <div className="divider text-xs text-base-content/40">School Details</div>

      <input type="text" placeholder="School Name" className="input input-bordered w-full"
        value={form.school_name} onChange={(e) => set('school_name', e.target.value)} required />
      <input type="text" placeholder="Class Name" className="input input-bordered w-full"
        value={form.class_name} onChange={(e) => set('class_name', e.target.value)} required />
      <input type="tel" placeholder="Contact Phone" className="input input-bordered w-full"
        value={form.phone} onChange={(e) => set('phone', e.target.value)} required />
      <input type="text" placeholder="Principal Name" className="input input-bordered w-full"
        value={form.principal_name} onChange={(e) => set('principal_name', e.target.value)} required />
      <input type="text" placeholder="Principal Contact (email or phone)" className="input input-bordered w-full"
        value={form.principal_contact} onChange={(e) => set('principal_contact', e.target.value)} required />

      {error && <div className="alert alert-error py-2 text-sm"><span>{error}</span></div>}

      <button type="submit" className="btn btn-neutral btn-lg w-full mt-2" disabled={loading}>
        {loading ? <span className="loading loading-spinner loading-sm" /> : 'Create Account'}
      </button>
    </form>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function RegisterPage() {
  const [tab, setTab] = useState<Tab>('parent')

  return (
    <main className="min-h-screen flex items-center justify-center bg-base-100 px-4 py-12">
      <div className="w-full max-w-sm flex flex-col items-center gap-6">
        <h1 className="text-4xl font-bold">Sign up</h1>

        {/* Tab switcher */}
        <div className="tabs tabs-bordered w-full justify-center">
          <button
            type="button"
            className={`tab tab-lg ${tab === 'parent' ? 'tab-active font-semibold' : ''}`}
            onClick={() => setTab('parent')}
          >
            Parent
          </button>
          <button
            type="button"
            className={`tab tab-lg ${tab === 'teacher' ? 'tab-active font-semibold' : ''}`}
            onClick={() => setTab('teacher')}
          >
            Teacher
          </button>
        </div>

        {tab === 'parent' ? <ParentForm /> : <TeacherForm />}

        <Link href="/login" className="btn btn-ghost btn-lg w-full border border-base-300">
          Login
        </Link>
      </div>
    </main>
  )
}
