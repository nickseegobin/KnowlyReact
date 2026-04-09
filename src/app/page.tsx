import Link from 'next/link'

export default function LandingPage() {
  return (
    <main className="min-h-screen">
      {/* ── Mobile layout (< lg) ── */}
      <div className="lg:hidden min-h-screen flex flex-col">
        <div className="bg-base-200 px-8 pt-16 pb-12 flex-1 flex flex-col justify-start">
          <p className="text-base font-medium mb-16">Knowley</p>
          <h1 className="text-4xl font-bold leading-tight mb-4">
            The Caribbean&apos;s first platform&nbsp;for education.
          </h1>
          <p className="text-base text-base-content/70 leading-relaxed">
            Uses artificial intelligence to generate unlimited, curriculum-aligned
            multiple choice practice exams for primary school students in Trinidad and Tobago.
          </p>
        </div>
        <div className="bg-base-100 px-8 py-12 flex flex-col gap-4">
          <Link href="/login" className="btn btn-neutral btn-lg w-full">
            Login
          </Link>
          <Link href="/register" className="btn btn-ghost btn-lg w-full border border-base-300">
            Create Account
          </Link>
        </div>
      </div>

      {/* ── Desktop layout (lg+) ── */}
      <div className="hidden lg:grid lg:grid-cols-2 min-h-screen">
        <div className="bg-base-200 flex flex-col justify-between p-16">
          <p className="text-base font-medium">Knowley</p>
          <div>
            <h1 className="text-5xl font-bold leading-tight mb-6">
              The Caribbean&apos;s first platform&nbsp;for education.
            </h1>
            <p className="text-lg text-base-content/70 leading-relaxed max-w-lg">
              Uses artificial intelligence to generate unlimited, curriculum-aligned
              multiple choice practice exams for primary school students in Trinidad and Tobago.
            </p>
          </div>
          <div />
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
