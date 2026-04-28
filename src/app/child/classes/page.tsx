import { redirect } from 'next/navigation'
import { getTokenFromCookie } from '@/lib/cookies'
import { wpFetch } from '@/lib/wp-api'
import Breadcrumb from '@/components/child/Breadcrumb'
import Image from 'next/image'
import Link from 'next/link'

interface ClassEntry {
  id: number
  name: string
  teacher_name?: string
  school_name?: string
  level?: string
  period?: string
  description?: string
}

function levelLabel(level?: string) {
  if (!level) return ''
  return level === 'std_4' ? 'Standard 4' : level === 'std_5' ? 'Standard 5' : level
}
function periodLabel(period?: string) {
  if (!period) return ''
  const map: Record<string, string> = { term_1: 'Term 1', term_2: 'Term 2', term_3: 'Term 3' }
  return map[period] ?? period
}

export default async function ClassesPage() {
  const token = await getTokenFromCookie()
  if (!token) redirect('/login')

  let classes: ClassEntry[] = []

  try {
    const data = await wpFetch<{ classes: ClassEntry[] } | ClassEntry[]>('/classes/my', 'GET', undefined, token)
    classes = Array.isArray(data) ? data : (data as { classes: ClassEntry[] }).classes ?? []
  } catch {}

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <Link href="/child/home" className="btn btn-circle btn-sm btn-ghost border border-base-300">‹</Link>
        <Breadcrumb crumbs={[{ label: 'Home', href: '/child/home' }, { label: 'Classes' }]} />
      </div>

      <div>
        <h1 className="text-3xl font-bold">Classes</h1>
        <p className="text-base-content/60">Select A Class</p>
      </div>

      {classes.length === 0 ? (
        <div className="flex flex-col items-center gap-4 py-16 text-center">
          <Image src="/icons/generic-icons.png" alt="No classes" width={64} height={64} className="object-contain opacity-40" />
          <p className="text-base-content/50 text-sm leading-relaxed max-w-xs">
            You haven&apos;t been enrolled in any classes yet.<br />
            Ask your teacher to invite you by your nickname.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {classes.map((cls) => {
            const levelStr = levelLabel(cls.level)
            const periodStr = periodLabel(cls.period)
            const badge = [levelStr, periodStr].filter(Boolean).join(' | ')

            return (
              <Link
                key={cls.id}
                href={`/child/classes/${cls.id}`}
                className="flex items-start gap-4 p-4 rounded-2xl bg-base-200 hover:bg-base-300 transition-colors"
              >
                <div className="w-12 h-12 shrink-0 mt-1">
                  <Image src="/icons/generic-icons.png" alt={cls.name} width={48} height={48} className="object-contain w-full h-full" />
                </div>
                <div className="flex flex-col gap-0.5 flex-1">
                  <p className="font-semibold text-base">{cls.name}</p>
                  <p className="text-sm text-base-content/60">{cls.teacher_name ?? 'Teacher'}</p>
                  {cls.school_name && <p className="text-xs text-base-content/50">{cls.school_name}</p>}
                  {badge && <p className="text-xs font-semibold">{badge}</p>}
                  {cls.description && <p className="text-xs text-base-content/50 mt-1 leading-snug">{cls.description}</p>}
                </div>
                <span className="text-base-content/30 self-center text-lg">›</span>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
