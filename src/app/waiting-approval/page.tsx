import Link from 'next/link'

export default function WaitingApprovalPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-base-100 px-4">
      <div className="w-full max-w-sm flex flex-col items-center gap-8 text-center">
        <div>
          <h1 className="text-4xl font-bold">Knowley</h1>
          <p className="text-base-content/60 mt-1">Teacher Account</p>
        </div>

        <div className="flex flex-col gap-3">
          <p className="text-lg font-semibold">Waiting for Approval</p>
          <p className="text-base-content/70 leading-relaxed">
            Your teacher account is still pending review by an administrator.
            You will receive an email once your account has been approved.
          </p>
        </div>

        <Link href="/login" className="btn btn-neutral btn-lg w-full">
          Back to Login
        </Link>
      </div>
    </main>
  )
}
