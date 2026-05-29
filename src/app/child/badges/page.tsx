import { redirect } from 'next/navigation'
import { Award } from 'lucide-react'
import { getTokenFromCookie } from '@/lib/cookies'
import { wpFetch } from '@/lib/wp-api'
import { headers } from 'next/headers'
import BadgeCard, { type BadgeAward } from '@/components/BadgeCard'

interface AwardsResponse {
  awards: BadgeAward[]
}

export const metadata = { title: 'My Badges | Knowly' }

export default async function BadgesPage() {
  const token = await getTokenFromCookie()
  if (!token) redirect('/login')

  let awards: BadgeAward[] = []
  try {
    const data = await wpFetch<AwardsResponse>('/badges/awards', 'GET', undefined, token)
    awards = data?.awards ?? []
  } catch { /* degrade gracefully */ }

  const headersList = await headers()
  const host     = headersList.get('host') ?? ''
  const protocol = host.startsWith('localhost') ? 'http' : 'https'
  const shareBaseUrl = `${protocol}://${host}`

  return (
    <div className="flex flex-col gap-5 py-2 max-w-2xl mx-auto">

      <div>
        <h1 className="text-2xl font-bold">My Badges</h1>
        <p className="text-sm text-base-content/50 mt-0.5">Your earned achievements</p>
      </div>

      {awards.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center text-base-content/40">
          <Award size={48} strokeWidth={1.2} />
          <div>
            <p className="font-semibold text-base text-base-content/60">No badges yet</p>
            <p className="text-sm mt-0.5">Complete quests, lessons, and trials to earn badges.</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {awards.map((award) => (
            <BadgeCard key={award.id} award={award} shareBaseUrl={shareBaseUrl} />
          ))}
        </div>
      )}

    </div>
  )
}
