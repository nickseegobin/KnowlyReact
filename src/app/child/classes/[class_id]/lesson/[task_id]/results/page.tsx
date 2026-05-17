'use client'

import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Breadcrumb from '@/components/child/Breadcrumb'

interface LessonResult {
  title: string
  subject: string
  sections_total: number
  class_id?: string
  task_id?: string
}

export default function ClassLessonResultsPage({
  params,
}: {
  params: Promise<{ class_id: string; task_id: string }>
}) {
  const { class_id, task_id } = use(params)
  const router = useRouter()
  const [result, setResult] = useState<LessonResult | null>(null)

  useEffect(() => {
    const stored = sessionStorage.getItem(`lesson_result_class_${task_id}`)
    if (!stored) { router.push(`/child/classes/${class_id}`); return }
    try {
      setResult(JSON.parse(stored))
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

  return (
    <div className="flex flex-col gap-4 pb-8">
      <div className="flex items-center gap-3">
        <button onClick={() => router.push(`/child/classes/${class_id}`)} className="btn btn-circle btn-sm btn-ghost border border-base-300">‹</button>
        <Breadcrumb crumbs={[
          { label: 'Home', href: '/child/home' },
          { label: 'Classes', href: '/child/classes' },
          { label: 'Class', href: `/child/classes/${class_id}` },
          { label: 'Lesson Complete' },
        ]} />
      </div>

      <div className="card bg-success/10 border border-success/20 rounded-2xl p-6 flex flex-col items-center gap-3 text-center">
        <div className="text-5xl">🎉</div>
        <h1 className="text-2xl font-bold">Lesson Complete!</h1>
        <p className="text-base-content/70 text-sm">{result.title}</p>
      </div>

      <div className="card bg-base-200 rounded-2xl p-4 flex flex-col gap-3">
        <div className="flex justify-between items-center">
          <span className="text-sm text-base-content/60">Sections Completed</span>
          <span className="font-semibold">{result.sections_total}/{result.sections_total}</span>
        </div>
        {result.subject && (
          <div className="flex justify-between items-center">
            <span className="text-sm text-base-content/60">Subject</span>
            <span className="font-semibold">{result.subject}</span>
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
