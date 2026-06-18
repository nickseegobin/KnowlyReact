'use client'

import { use, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import LessonPlayer, { type Section, type OnCompleteParams } from '@/components/child/LessonPlayer'

interface LessonData {
  quest_id:      string
  module_title?: string
  title?:        string
  subject:       string
  topic?:        string
  gem_cost?:     number
  content?:      { sections: Section[] }
  sections?:     Section[]
}

export default function LessonDetailPage({
  params,
}: {
  params: Promise<{ lesson_id: string }>
}) {
  const { lesson_id } = use(params)
  const router        = useRouter()
  const searchParams  = useSearchParams()
  const topicParam    = searchParams.get('topic') ?? ''

  const [lesson,    setLesson]    = useState<LessonData | null>(null)
  const [sections,  setSections]  = useState<Section[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/lessons/${lesson_id}`)
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
  }, [lesson_id])

  async function handleStart(_activeSectionIdx: number | null) {
    const res = await fetch('/api/lessons/start', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ quest_id: lesson_id, source: 'direct' }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.message ?? 'Failed to start lesson')
    return data
  }

  async function handleComplete({ sessionId, activeSectionIdx }: OnCompleteParams) {
    const res  = await fetch('/api/lessons/complete', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ session_id: sessionId }),
    })
    const data = await res.json()
    sessionStorage.setItem(`quest_result_${lesson_id}`, JSON.stringify({
      quest_id:           lesson_id,
      title:              activeSectionIdx !== null
                            ? (sections[activeSectionIdx]?.title ?? lesson?.module_title ?? lesson_id)
                            : (lesson?.module_title ?? lesson?.title ?? lesson_id),
      subject:            lesson?.subject ?? '',
      topic:              topicParam
                            || (activeSectionIdx !== null ? sections[activeSectionIdx]?.title : lesson?.topic)
                            || '',
      sections_total:     sections.length,
      sections_completed: activeSectionIdx !== null ? 1 : sections.length,
      badge_name:         null,
      badge_earned:       false,
      gems_awarded:       data.gems_awarded ?? 0,
      score:              100,
      is_first_completion: data.is_first_completion ?? false,
    }))
    router.push(`/child/lessons/${lesson_id}/results`)
  }

  return (
    <LessonPlayer
      sections={sections}
      moduleTitle={lesson?.module_title ?? lesson?.title ?? lesson_id}
      subject={lesson?.subject}
      isLoading={isLoading}
      loadError={loadError}
      gemCost={lesson?.gem_cost}
      backLabel="← Lessons"
      onBack={() => router.push('/child/lessons')}
      onStart={handleStart}
      onComplete={handleComplete}
    />
  )
}
