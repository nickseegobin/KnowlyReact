import { redirect } from 'next/navigation'
import { getTokenFromCookie } from '@/lib/cookies'
import { wpFetch } from '@/lib/wp-api'
import Breadcrumb from '@/components/child/Breadcrumb'
import Image from 'next/image'
import Link from 'next/link'
import type { AuthUser } from '@/types/knowly'

interface CatalogueEntry {
  subject: string
  difficulty: string
  pool_count: number
}

const DIFFICULTIES = [
  { key: 'easy', label: 'Easy', desc: '10 questions · 90 sec each' },
  { key: 'medium', label: 'Medium', desc: '15 questions · 90 sec each' },
  { key: 'hard', label: 'Trial', desc: '20 questions · 90 sec each' },
]

function levelLabel(level: string) {
  return level === 'std_4' ? 'Standard 4' : level === 'std_5' ? 'Standard 5' : level
}
function periodLabel(period: string) {
  const map: Record<string, string> = { term_1: 'Term 1', term_2: 'Term 2', term_3: 'Term 3' }
  return map[period] ?? period
}

export default async function TrialSubjectPage({
  params,
}: {
  params: Promise<{ subject: string }>
}) {
  const { subject: encodedSubject } = await params
  const subject = decodeURIComponent(encodedSubject)

  const token = await getTokenFromCookie()
  if (!token) redirect('/login')

  let availableDifficulties: string[] = ['easy', 'medium', 'hard']
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
      const available = (data?.catalogue ?? []).map((e) => e.difficulty)
      if (available.length > 0) availableDifficulties = available
    }
  } catch {
    // show all difficulties if API fails
  }

  const displayDifficulties = DIFFICULTIES.filter((d) => availableDifficulties.includes(d.key))

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <Link href="/child/trials" className="btn btn-circle btn-sm btn-ghost border border-base-300">‹</Link>
        <Breadcrumb crumbs={[
          { label: 'Home', href: '/child/home' },
          { label: 'Trials', href: '/child/trials' },
          { label: subject },
        ]} />
      </div>

      <div>
        <h1 className="text-3xl font-bold">{subject}</h1>
        {levelText && <p className="text-base-content/60">{levelText}</p>}
      </div>

      <div className="flex flex-col gap-3">
        {displayDifficulties.map(({ key, label, desc }) => (
          <Link
            key={key}
            href={`/child/trials/${encodedSubject}/${key}`}
            className="flex items-center gap-4 p-4 rounded-2xl bg-base-200 hover:bg-base-300 transition-colors"
          >
            <div className="w-12 h-12 shrink-0">
              <Image src="/icons/generic-icons.png" alt={label} width={48} height={48} className="object-contain w-full h-full" />
            </div>
            <div>
              <p className="font-semibold text-base">{label}</p>
              <p className="text-xs text-base-content/60">{desc}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
