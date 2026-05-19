import { redirect } from 'next/navigation'
import { DISPLAY_TO_CODE } from '@/lib/subject-catalogue'

export default async function SubjectLeaderboardRedirect({
  params,
}: {
  params: Promise<{ subject: string }>
}) {
  const { subject } = await params
  const decoded = decodeURIComponent(subject)
  const code    = DISPLAY_TO_CODE[decoded] ?? decoded.toLowerCase().replace(/ /g, '_')
  redirect(`/child/leaderboard?subject=${code}`)
}
