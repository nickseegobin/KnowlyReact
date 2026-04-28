'use client'

import { useRouter } from 'next/navigation'

export default function SettingsPage() {
  const router = useRouter()

  return (
    <div className="max-w-lg mx-auto py-4 flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="btn btn-ghost btn-sm btn-square">←</button>
        <h1 className="text-xl font-bold">Settings</h1>
      </div>

      <div className="bg-base-200 rounded-2xl p-10 text-center">
        <p className="text-base-content/40 text-sm">Settings coming soon.</p>
      </div>
    </div>
  )
}
