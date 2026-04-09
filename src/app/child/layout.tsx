import { redirect } from 'next/navigation'
import { getTokenFromCookie } from '@/lib/cookies'
import { wpFetch } from '@/lib/wp-api'
import ChildLayout from '@/components/child/ChildLayout'
import type { AuthUser } from '@/types/knowly'

async function getChildData(token: string) {
  const [user, gems] = await Promise.allSettled([
    wpFetch<AuthUser>('/auth/me', 'GET', undefined, token),
    wpFetch<{ blue_gem_balance: number; red_gem_balance: number }>('/gems/balance', 'GET', undefined, token),
  ])

  const userData = user.status === 'fulfilled' ? user.value : null
  const gemData = gems.status === 'fulfilled' ? gems.value : { blue_gem_balance: 0, red_gem_balance: 0 }

  return { userData, gemData }
}

export default async function ChildAppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const token = await getTokenFromCookie()
  if (!token) redirect('/login')

  const { userData, gemData } = await getChildData(token)
  if (!userData) redirect('/login')

  // Teachers and unapproved users should not reach child screens
  if ((userData as AuthUser).role === 'teacher') redirect('/teacher-profile')

  return (
    <ChildLayout
      user={userData as AuthUser}
      blueGems={gemData?.blue_gem_balance ?? 0}
      redGems={gemData?.red_gem_balance ?? 0}
    >
      {children}
    </ChildLayout>
  )
}
