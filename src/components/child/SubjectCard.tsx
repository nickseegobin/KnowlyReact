import Link from 'next/link'
import Image from 'next/image'

interface Props {
  subject: string
  href: string
  description?: string
}

const SUBJECT_DESCRIPTIONS: Record<string, string> = {
  'Mathematics': 'Numbers, operations, geometry and problem solving.',
  'English Language Arts': 'Reading, writing, comprehension and language skills.',
  'Science': 'Life science, earth science and physical science.',
  'Social Studies': 'History, geography, civics and Caribbean culture.',
}

export default function SubjectCard({ subject, href, description }: Props) {
  const desc = description ?? SUBJECT_DESCRIPTIONS[subject] ?? ''

  return (
    <Link
      href={href}
      className="flex flex-col p-4 rounded-2xl bg-base-200 hover:bg-base-300 transition-colors gap-3"
    >
      <div className="w-14 h-14">
        <Image
          src="/icons/generic-icons.png"
          alt={subject}
          width={56}
          height={56}
          className="object-contain w-full h-full"
        />
      </div>
      <div>
        <p className="font-semibold text-base">{subject}</p>
        <p className="text-xs text-base-content/60 leading-snug mt-1">{desc}</p>
      </div>
    </Link>
  )
}
