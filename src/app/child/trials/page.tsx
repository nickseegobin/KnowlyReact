import { redirect } from 'next/navigation'
import { getTokenFromCookie } from '@/lib/cookies'
import { wpFetch } from '@/lib/wp-api'
import SubjectCard from '@/components/child/SubjectCard'
import Breadcrumb from '@/components/child/Breadcrumb'
import Link from 'next/link'

interface CatalogueEntry {
  standard: string
  term: string
  subject: string
  difficulty: string
  pool_count: number
}

const SUBJECT_ORDER = ['Mathematics', 'English Language Arts', 'Science', 'Social Studies']

export default async function TrialsPage() {
  const token = await getTokenFromCookie()
  if (!token) redirect('/login')

  let subjects: string[] = SUBJECT_ORDER

  try {
    const data = await wpFetch<{ catalogue: CatalogueEntry[] }>('/exams', 'GET', undefined, token)
    const fromApi = [...new Set((data?.catalogue ?? []).map((e) => e.subject))]
    if (fromApi.length > 0) {
      subjects = SUBJECT_ORDER.filter((s) => fromApi.includes(s))
    }
  } catch {
    // fall back to full subject list
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <Link href="/child/home" className="btn btn-circle btn-sm btn-ghost border border-base-300">‹</Link>
        <Breadcrumb crumbs={[{ label: 'Home', href: '/child/home' }, { label: 'Trials' }]} />
      </div>

      <div>
        <h1 className="text-3xl font-bold">Trials</h1>
        <p className="text-base-content/60">Select A Trial</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {subjects.map((subject) => (
          <SubjectCard
            key={subject}
            subject={subject}
            href={`/child/trials/${encodeURIComponent(subject)}`}
          />
        ))}
      </div>
    </div>
  )
}
