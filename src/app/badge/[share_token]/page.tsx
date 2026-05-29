import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { wpFetch, WPApiError } from '@/lib/wp-api'
import { injectPeriodColors, DEFAULT_BADGE_SVG } from '@/lib/badgeSvg'

interface PublicAward {
  id: number
  name: string
  description: string
  trigger_type: 'quest_module_completion' | 'trial_count' | 'lesson_count'
  subject: string
  period: string | null
  level: string
  svg_markup: string | null
  awarded_at: string
  share_token: string
  nickname: string
}

type PageProps = {
  params: Promise<{ share_token: string }>
}

async function fetchAward(token: string): Promise<PublicAward | null> {
  try {
    return await wpFetch<PublicAward>(`/badges/public/${token}`)
  } catch (err) {
    if (err instanceof WPApiError && err.status === 404) return null
    return null
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { share_token } = await params
  const award = await fetchAward(share_token)
  if (!award) return { title: 'Badge | Knowly' }

  const title       = `${award.nickname} earned "${award.name}" | Knowly`
  const description = award.description || `${award.nickname} earned a badge on Knowly!`

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      siteName: 'Knowly',
      type:     'website',
    },
    twitter: {
      card:        'summary',
      title,
      description,
    },
  }
}

const LEVEL_LABEL: Record<string, string> = {
  std_4: 'Standard 4',
  std_5: 'Standard 5',
}

const PERIOD_LABEL: Record<string, string> = {
  term_1:     'Term 1',
  term_2:     'Term 2',
  term_3:     'Term 3',
  semester_1: 'Semester 1',
  semester_2: 'Semester 2',
  capstone:   'Capstone',
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })
}

export default async function BadgeSharePage({ params }: PageProps) {
  const { share_token } = await params
  const award = await fetchAward(share_token)
  if (!award) notFound()

  const svgSource = award.svg_markup || DEFAULT_BADGE_SVG
  const svgFinal  = injectPeriodColors(svgSource, award.period)

  const levelLabel  = LEVEL_LABEL[award.level]  ?? award.level
  const periodLabel = award.period ? (PERIOD_LABEL[award.period] ?? award.period) : null

  return (
    <div className="min-h-screen bg-base-100 flex flex-col items-center justify-center px-4 py-12 gap-8">

      <div className="flex flex-col items-center gap-6 max-w-xs text-center">

        <div
          className="w-40 h-40 drop-shadow-lg"
          dangerouslySetInnerHTML={{ __html: svgFinal }}
          aria-hidden="true"
        />

        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold leading-tight">{award.name}</h1>
          {award.description && (
            <p className="text-sm text-base-content/60 leading-relaxed">{award.description}</p>
          )}
        </div>

        <div className="flex flex-col gap-1 text-sm text-base-content/50">
          <p>
            Earned by <span className="font-semibold text-base-content/80">@{award.nickname}</span>
          </p>
          <p>{formatDate(award.awarded_at)}</p>
          {(levelLabel || periodLabel) && (
            <p>{[levelLabel, periodLabel].filter(Boolean).join(' · ')}</p>
          )}
        </div>

      </div>

      <div className="flex flex-col items-center gap-2 text-center">
        <p className="text-xs text-base-content/40">Powered by</p>
        <Link href="/" className="font-bold text-lg text-primary">
          Knowly
        </Link>
        <p className="text-xs text-base-content/40 max-w-56">
          The Caribbean learning platform for young scholars.
        </p>
      </div>

    </div>
  )
}
