import Link from 'next/link'
import HomeLottiePanel from '@/components/HomeLottiePanel'

export default function LandingPage() {
  return (
    <main className="min-h-screen">
      {/* ── Mobile: login only (left panel hidden) ── */}
      <div className="lg:hidden min-h-screen flex flex-col items-center justify-center p-8 gap-6 bg-base-100">
        <h2 className="text-5xl font-bold">Knowley</h2>
        <Link href="/login" className="btn btn-neutral btn-lg w-72">
          Login
        </Link>
        <Link href="/register" className="btn btn-ghost btn-lg w-72 border border-base-300">
          Create Account
        </Link>
      </div>

      {/* ── Desktop: left animation + right login ── */}
      <div className="hidden lg:grid lg:grid-cols-2 h-screen">
        <div className="bg-base-200 relative overflow-hidden flex items-center justify-center">
          <HomeLottiePanel />
        </div>
        <div className="flex flex-col items-center justify-center p-16 gap-6">
          <h2 className="text-5xl font-bold mb-4">Knowley</h2>
          <Link href="/login" className="btn btn-neutral btn-lg w-72">
            Login
          </Link>
          <Link href="/register" className="btn btn-ghost btn-lg w-72 border border-base-300">
            Create Account
          </Link>
        </div>
      </div>
    </main>
  )
}
