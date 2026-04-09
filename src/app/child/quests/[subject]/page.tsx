import { redirect } from 'next/navigation'
import { getTokenFromCookie } from '@/lib/cookies'
import { wpFetch } from '@/lib/wp-api'
import Breadcrumb from '@/components/child/Breadcrumb'
import Image from 'next/image'
import Link from 'next/link'
import type { AuthUser } from '@/types/knowly'

interface CatalogueEntry {
  subject: string
  topic?: string
  topics_covered?: string[]
}

function levelLabel(level: string) {
  return level === 'std_4' ? 'Standard 4' : level === 'std_5' ? 'Standard 5' : level
}
function periodLabel(period: string) {
  const map: Record<string, string> = { term_1: 'Term 1', term_2: 'Term 2', term_3: 'Term 3' }
  return map[period] ?? period
}

// Derive topics from catalogue entries for this subject
function getTopics(catalogue: CatalogueEntry[], subject: string): string[] {
  const topics = new Set<string>()
  catalogue
    .filter((e) => e.subject === subject)
    .forEach((e) => {
      if (e.topic) topics.add(e.topic)
      if (e.topics_covered) e.topics_covered.forEach((t) => topics.add(t))
    })
  return [...topics]
}

// Fallback topics per subject if API returns none
const FALLBACK_TOPICS: Record<string, string[]> = {
  'Mathematics': ['Fractions', 'Decimals', 'Percentages', 'Geometry', 'Statistics'],
  'English Language Arts': ['Comprehension', 'Grammar', 'Vocabulary', 'Writing', 'Poetry'],
  'Science': ['Living Things', 'Forces & Motion', 'Matter', 'Earth & Space', 'Energy'],
  'Social Studies': ['Our Community', 'Government', 'History', 'Geography', 'Culture'],
}

export default async function QuestSubjectPage({
  params,
}: {
  params: Promise<{ subject: string }>
}) {
  const { subject: encodedSubject } = await params
  const subject = decodeURIComponent(encodedSubject)

  const token = await getTokenFromCookie()
  if (!token) redirect('/login')

  let topics: string[] = FALLBACK_TOPICS[subject] ?? []
  let levelText = ''

  try {
    const user = await wpFetch<AuthUser>('/auth/me', 'GET', undefined, token)
    const activeChild = user.children?.find((c) => c.child_id === user.active_child_id) ?? user.children?.[0]
    if (activeChild) {
      const level = activeChild.level
      const period = activeChild.period
      levelText = period ? `${levelLabel(level)} | ${periodLabel(period)}` : levelLabel(level)

      const data = await wpFetch<{ catalogue: CatalogueEntry[] }>(
        `/exams?level=${level}&period=${period}&subject=${encodeURIComponent(subject)}`,
        'GET', undefined, token
      )
      const fromApi = getTopics(data?.catalogue ?? [], subject)
      if (fromApi.length > 0) topics = fromApi
    }
  } catch {}

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <Link href="/child/quests" className="btn btn-circle btn-sm btn-ghost border border-base-300">‹</Link>
        <Breadcrumb crumbs={[
          { label: 'Home', href: '/child/home' },
          { label: 'Quests', href: '/child/quests' },
          { label: subject },
        ]} />
      </div>

      <div>
        <h1 className="text-3xl font-bold">{subject}</h1>
        {levelText && <p className="text-base-content/60">{levelText}</p>}
      </div>

      <div className="flex flex-col gap-3">
        {topics.map((topic) => (
          <div
            key={topic}
            className="flex items-center gap-4 p-4 rounded-2xl bg-base-200 hover:bg-base-300 transition-colors cursor-pointer"
          >
            <div className="w-12 h-12 shrink-0">
              <Image src="/icons/generic-icons.png" alt={topic} width={48} height={48} className="object-contain w-full h-full" />
            </div>
            <div>
              <p className="font-semibold text-base">{topic}</p>
              <p className="text-xs text-base-content/60">Curriculum-aligned learning module</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
