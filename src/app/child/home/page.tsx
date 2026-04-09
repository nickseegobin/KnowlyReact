import Link from 'next/link'
import Image from 'next/image'

const HOME_ITEMS = [
  { label: 'Quests', href: '/child/quests', desc: 'Structured learning modules aligned to your curriculum.' },
  { label: 'Trials', href: '/child/trials', desc: 'Practice exams to test your knowledge and earn gems.' },
  { label: 'Classes', href: '/child/classes', desc: 'View classes assigned by your teacher.' },
  { label: 'Leaderboard', href: '/leaderboard', desc: 'See how you rank against other students today.' },
  { label: 'Progress', href: '/my-progress', desc: 'Track your improvement across all subjects.' },
  { label: 'Badges', href: '/badges', desc: 'Earn badges by completing Quests for the first time.' },
  { label: 'News', href: '/news', desc: 'Platform updates and announcements.' },
]

export default function ChildHomePage() {
  return (
    <div className="flex flex-col gap-3 py-2">
      {HOME_ITEMS.map(({ label, href, desc }) => (
        <Link
          key={label}
          href={href}
          className="flex items-center gap-4 p-4 rounded-2xl bg-base-200 hover:bg-base-300 transition-colors"
        >
          <div className="w-12 h-12 shrink-0">
            <Image
              src="/icons/generic-icons.png"
              alt={label}
              width={48}
              height={48}
              className="object-contain w-full h-full"
            />
          </div>
          <div>
            <p className="font-semibold text-base">{label}</p>
            <p className="text-sm text-base-content/60 leading-snug">{desc}</p>
          </div>
        </Link>
      ))}
    </div>
  )
}
