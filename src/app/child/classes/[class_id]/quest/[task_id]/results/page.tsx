'use client'

import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Breadcrumb from '@/components/child/Breadcrumb'

interface QuestResult {
  quest_id: string
  title: string
  subject: string
  sections_total: number
  sections_completed: number
  badge_name?: string
  badge_earned?: boolean
  gems_awarded?: number
  gem_reward?: number
  class_id?: string
  task_id?: string
}

export default function ClassQuestResultsPage({
  params,
}: {
  params: Promise<{ class_id: string; task_id: string }>
}) {
  const { class_id, task_id } = use(params)
  const router = useRouter()
  const [result, setResult] = useState<QuestResult | null>(null)

  useEffect(() => {
    const stored = sessionStorage.getItem(`quest_result_class_${task_id}`)
    if (!stored) { router.push(`/child/classes/${class_id}`); return }
    try {
      setResult(JSON.parse(stored))
      // Do not remove key here — Strict Mode fires this effect twice in dev,
      // so removing on first run means the second run finds nothing and redirects.
    } catch {
      router.push(`/child/classes/${class_id}`)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!result) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <span className="loading loading-spinner loading-lg" />
      </div>
    )
  }

  const totalGems = (result.gems_awarded ?? 0) + (result.gem_reward ?? 0)

  return (
    <div className="flex flex-col gap-4 pb-8">
      <div className="flex items-center gap-3">
        <button onClick={() => router.push(`/child/classes/${class_id}`)} className="btn btn-circle btn-sm btn-ghost border border-base-300">‹</button>
        <Breadcrumb crumbs={[
          { label: 'Home', href: '/child/home' },
          { label: 'Classes', href: '/child/classes' },
          { label: 'Class', href: `/child/classes/${class_id}` },
          { label: 'Quest Complete' },
        ]} />
      </div>

      {/* Completion banner */}
      <div className="card bg-success/10 border border-success/20 rounded-2xl p-6 flex flex-col items-center gap-3 text-center">
        <div className="text-5xl">🎉</div>
        <h1 className="text-2xl font-bold">Quest Complete!</h1>
        <p className="text-base-content/70 text-sm">{result.title}</p>
      </div>

      {/* Stats */}
      <div className="card bg-base-200 rounded-2xl p-4 flex flex-col gap-3">
        <div className="flex justify-between items-center">
          <span className="text-sm text-base-content/60">Sections Completed</span>
          <span className="font-semibold">{result.sections_completed}/{result.sections_total}</span>
        </div>

        {totalGems > 0 && (
          <div className="flex justify-between items-center">
            <span className="text-sm text-base-content/60">Gems Earned</span>
            <div className="flex items-center gap-1 font-semibold text-success">
              <Image src="/icons/blue-gem.png" alt="gems" width={18} height={18} />
              +{totalGems}
            </div>
          </div>
        )}

        {result.badge_earned && result.badge_name && (
          <div className="flex justify-between items-center">
            <span className="text-sm text-base-content/60">Badge Earned</span>
            <span className="badge badge-success gap-1">🏅 {result.badge_name}</span>
          </div>
        )}
      </div>

      <button
        onClick={() => router.push(`/child/classes/${class_id}`)}
        className="btn btn-neutral btn-lg w-full mt-2"
      >
        Back to Class
      </button>
    </div>
  )
}
