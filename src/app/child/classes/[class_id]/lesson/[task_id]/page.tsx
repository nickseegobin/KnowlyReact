'use client'

import { use, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import LessonPlayer, { type Section, type OnCompleteParams } from '@/components/child/LessonPlayer'

interface LessonData {
  quest_id:      string
  module_title?: string
  title?:        string
  subject:       string
  content?:      { sections: Section[] }
  sections?:     Section[]
}

export default function ClassLessonPage({
  params,
}: {
  params: Promise<{ class_id: string; task_id: string }>
}) {
  const { class_id, task_id } = use(params)
  const searchParams          = useSearchParams()
  const router                = useRouter()

  const title        = searchParams.get('title')   ?? 'Lesson'
  const subjectParam = searchParams.get('subject') ?? ''
  const refId        = searchParams.get('ref')     ?? ''

  const sectionParam  = searchParams.get('section')
  const singleSection: number | null = sectionParam !== null ? parseInt(sectionParam, 10) : null

  const [lesson,    setLesson]    = useState<LessonData | null>(null)
  const [sections,  setSections]  = useState<Section[]>([])
  const [isLoading, setIsLoading] = useState(!!refId)
  const [loadError, setLoadError] = useState(
    refId ? '' : 'No lesson has been linked to this task. Please ask your teacher.'
  )

  useEffect(() => {
    if (!refId) return
    async function load() {
      try {
        const res = await fetch(`/api/lessons/${refId}`)
        if (!res.ok) throw new Error('Lesson not found')
        const data: LessonData = await res.json()
        setLesson(data)
        const raw = data.content?.sections ?? data.sections ?? []
        setSections(raw.map(sec => ({
          ...sec,
          explanation:     sec.explanation ?? (sec.content ? [sec.content] : []),
          knowledge_check: sec.knowledge_check ?? [],
        })))
      } catch (e) {
        setLoadError(e instanceof Error ? e.message : 'Failed to load lesson')
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [refId])

  async function handleStart(_activeSectionIdx: number | null) {
    const res = await fetch('/api/lessons/start', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ quest_id: refId, source: 'assignment', task_id: parseInt(task_id, 10) }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.message ?? 'Failed to start lesson')
    return data
  }

  async function handleComplete({ sessionId }: OnCompleteParams) {
    await fetch('/api/lessons/complete', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ session_id: sessionId }),
    })
    sessionStorage.setItem(`lesson_result_class_${task_id}`, JSON.stringify({
      title:          lesson?.module_title ?? lesson?.title ?? title,
      subject:        subjectParam || lesson?.subject,
      sections_total: sections.length,
      class_id,
      task_id,
    }))
    router.push(`/child/classes/${class_id}/lesson/${task_id}/results`)
  }

  return (
    <LessonPlayer
      sections={sections}
      moduleTitle={lesson?.module_title ?? lesson?.title ?? title}
      subject={subjectParam || lesson?.subject}
      isLoading={isLoading}
      loadError={loadError}
      singleSection={singleSection}
      assignedNote="Assigned by your teacher — no gems required"
      backLabel="← Class"
      onBack={() => router.push(`/child/classes/${class_id}`)}
      onStart={handleStart}
      onComplete={handleComplete}
    />
  )
}
