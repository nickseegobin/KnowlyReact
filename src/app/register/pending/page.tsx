import Link from 'next/link'

export default function PendingPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-base-100 px-4">
      <div className="w-full max-w-sm flex flex-col items-center gap-8 text-center">
        <div>
          <h1 className="text-4xl font-bold">Sign up</h1>
          <p className="text-base-content/60 mt-1">Teacher</p>
        </div>

        <div className="flex flex-col gap-4">
          <p className="text-lg font-semibold leading-snug">
            THANK YOU!
          </p>
          <p className="text-base-content/70 leading-relaxed">
            Your account is being processed and confirmation will be emailed to you soon.
          </p>
          <p className="text-sm text-base-content/50">
            Once approved by an administrator you will be able to log in and access the platform.
          </p>
        </div>

        <Link href="/login" className="btn btn-neutral btn-lg w-full">
          Back to Login
        </Link>
      </div>
    </main>
  )
}
