'use client'

import { use, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import LessonPlayer, { type Section, type OnCompleteParams } from '@/components/child/LessonPlayer'

interface QuestData {
  quest_id:      string
  module_title?: string
  title?:        string
  subject:       string
  topic?:        string
  gem_cost?:     number
  badge_name?:   string
  content?:      { sections: Section[] }
  sections?:     Section[]
}

export default function QuestDetailPage({
  params,
}: {
  params: Promise<{ quest_id: string }>
}) {
  const { quest_id } = use(params)
  const router       = useRouter()
  const searchParams = useSearchParams()

  const sectionParam = searchParams.get('section')
  const singleSection: number | null =
    sectionParam !== null && !isNaN(Number(sectionParam)) ? Number(sectionParam) : null

  const topicParam   = searchParams.get('topic')   ?? ''
  const subjectParam = searchParams.get('subject') ?? ''

  const [quest,     setQuest]     = useState<QuestData | null>(null)
  const [sections,  setSections]  = useState<Section[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/quests/${quest_id}`)
        if (!res.ok) throw new Error('Quest not found')
        const data: QuestData = await res.json()
        setQuest(data)
        const raw = data.content?.sections ?? data.sections ?? []
        setSections(raw.map(sec => ({
          ...sec,
          explanation:     sec.explanation ?? (sec.content ? [sec.content] : []),
          knowledge_check: sec.knowledge_check ?? [],
        })))
      } catch (e) {
        setLoadError(e instanceof Error ? e.message : 'Failed to load quest')
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [quest_id])

  async function handleStart(_activeSectionIdx: number | null) {
    const res = await fetch('/api/quests/start', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ quest_id, source: 'direct' }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.message ?? 'Failed to start quest')
    return data
  }

  async function handleComplete({ sessionId, activeSectionIdx }: OnCompleteParams) {
    const sectionsToComplete = activeSectionIdx !== null
      ? [sections[activeSectionIdx]]
      : sections

    // Mark each played section complete (non-fatal)
    for (const sec of sectionsToComplete) {
      if (sec?.section_id) {
        await fetch(`/api/quests/sessions/${sessionId}/section-complete`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ section_id: sec.section_id }),
        }).catch(() => {})
      }
    }

    const res = await fetch('/api/quests/complete', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        session_id:         sessionId,
        sections_completed: sectionsToComplete.length,
        sections_total:     sections.length,
        topic:              topicParam,
        subject:            quest?.subject ?? '',
        score:              100,
      }),
    })
    const data = await res.json()

    sessionStorage.setItem(`quest_result_${quest_id}`, JSON.stringify({
      quest_id,
      title:              activeSectionIdx !== null
                            ? (sections[activeSectionIdx]?.title ?? quest?.module_title ?? quest_id)
                            : (quest?.module_title ?? quest?.title ?? quest_id),
      subject:            quest?.subject ?? '',
      topic:              activeSectionIdx !== null
                            ? (sections[activeSectionIdx]?.title ?? '')
                            : (quest?.topic ?? ''),
      sections_total:     sections.length,
      sections_completed: sectionsToComplete.length,
      badge_name:         data.badge_name ?? quest?.badge_name ?? null,
      badge_earned:       data.badge_earned ?? false,
      gems_awarded:       data.gems_awarded ?? 0,
      score:              100,
      is_first_completion: data.is_first_completion ?? false,
    }))

    const subject = quest?.subject || subjectParam
    router.push(`/child/quests/${quest_id}/results?subject=${subject}`)
  }

  const backSubject = quest?.subject || subjectParam
  const backHref    = `/child/quests${backSubject ? `?subject=${backSubject}` : ''}`

  return (
    <LessonPlayer
      sections={sections}
      moduleTitle={quest?.module_title ?? quest?.title ?? quest_id}
      subject={quest?.subject}
      isLoading={isLoading}
      loadError={loadError}
      singleSection={singleSection}
      gemCost={quest?.gem_cost}
      backLabel="← Quests"
      onBack={() => router.push(backHref)}
      onStart={handleStart}
      onComplete={handleComplete}
    />
  )
}
