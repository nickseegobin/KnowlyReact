import { redirect } from 'next/navigation'
import { getTokenFromCookie } from '@/lib/cookies'
import { wpFetch } from '@/lib/wp-api'
import ParentLayout from '@/components/parent/ParentLayout'
import type { AuthUser } from '@/types/knowly'

async function getParentData(token: string) {
  const [user, gems] = await Promise.allSettled([
    wpFetch<AuthUser>('/auth/me', 'GET', undefined, token),
    wpFetch<{ balance: number }>('/gems/balance?scope=parent', 'GET', undefined, token),
  ])
  return {
    userData: user.status === 'fulfilled' ? user.value : null,
    gemBalance: gems.status === 'fulfilled' ? gems.value.balance : 0,
  }
}

export default async function ParentProfileLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const token = await getTokenFromCookie()
  if (!token) redirect('/login')

  const { userData, gemBalance } = await getParentData(token)
  if (!userData) redirect('/login')
  if (userData.role !== 'parent') redirect('/')

  return (
    <ParentLayout user={userData} blueGems={gemBalance}>
      {children}
    </ParentLayout>
  )
}
