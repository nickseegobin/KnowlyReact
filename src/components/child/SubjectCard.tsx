import Link from 'next/link'

interface Props {
  subject: string
  href: string
  description?: string
}

const SUBJECT_CONFIG: Record<string, { emoji: string; from: string; to: string; border: string }> = {
  'Mathematics': {
    emoji: '📐',
    from: 'from-blue-500/15',
    to: 'to-indigo-500/15',
    border: 'border-blue-400/20',
  },
  'English Language Arts': {
    emoji: '📖',
    from: 'from-emerald-500/15',
    to: 'to-teal-500/15',
    border: 'border-emerald-400/20',
  },
  'Language Arts': {
    emoji: '📖',
    from: 'from-emerald-500/15',
    to: 'to-teal-500/15',
    border: 'border-emerald-400/20',
  },
  'Science': {
    emoji: '🔬',
    from: 'from-violet-500/15',
    to: 'to-purple-500/15',
    border: 'border-violet-400/20',
  },
  'Social Studies': {
    emoji: '🌍',
    from: 'from-orange-500/15',
    to: 'to-amber-500/15',
    border: 'border-orange-400/20',
  },
}

const SUBJECT_DESCRIPTIONS: Record<string, string> = {
  'Mathematics': 'Numbers, operations, geometry and problem solving.',
  'English Language Arts': 'Reading, writing, comprehension and language skills.',
  'Language Arts': 'Reading, writing, comprehension and language skills.',
  'Science': 'Life science, earth science and physical science.',
  'Social Studies': 'History, geography, civics and Caribbean culture.',
}

const FALLBACK = { emoji: '📚', from: 'from-base-200', to: 'to-base-300', border: 'border-base-300' }

export default function SubjectCard({ subject, href, description }: Props) {
  const config = SUBJECT_CONFIG[subject] ?? FALLBACK
  const desc = description ?? SUBJECT_DESCRIPTIONS[subject] ?? ''

  return (
    <Link
      href={href}
      className={`flex flex-col p-4 rounded-2xl bg-gradient-to-br ${config.from} ${config.to}
        border ${config.border} hover:scale-[1.03] active:scale-[0.97]
        transition-transform duration-150 gap-3`}
    >
      <div className="text-4xl leading-none">{config.emoji}</div>
      <div>
        <p className="font-semibold text-base">{subject}</p>
        {desc && <p className="text-xs text-base-content/60 leading-snug mt-1">{desc}</p>}
      </div>
    </Link>
  )
}
