import { redirect } from 'next/navigation'
import { getTokenFromCookie } from '@/lib/cookies'
import SubjectCard from '@/components/child/SubjectCard'
import Breadcrumb from '@/components/child/Breadcrumb'
import Link from 'next/link'

const SUBJECTS = ['Mathematics', 'English Language Arts', 'Science', 'Social Studies']

export default async function LeaderboardPage() {
  const token = await getTokenFromCookie()
  if (!token) redirect('/login')

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <Link href="/child/home" className="btn btn-circle btn-sm btn-ghost border border-base-300">‹</Link>
        <Breadcrumb crumbs={[
          { label: 'Home', href: '/child/home' },
          { label: 'Leaderboard' },
        ]} />
      </div>

      <div>
        <h1 className="text-3xl font-bold">Leaderboard</h1>
        <p className="text-base-content/60">Select a subject to see today&apos;s top players</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {SUBJECTS.map((subject) => (
          <SubjectCard
            key={subject}
            subject={subject}
            href={`/child/leaderboard/${encodeURIComponent(subject)}`}
          />
        ))}
      </div>
    </div>
  )
}
