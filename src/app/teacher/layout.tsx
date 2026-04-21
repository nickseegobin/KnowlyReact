import { redirect } from 'next/navigation'
import { getTokenFromCookie } from '@/lib/cookies'
import { wpFetch } from '@/lib/wp-api'
import TeacherLayout from '@/components/teacher/TeacherLayout'
import type { TeacherProfile } from '@/types/knowly'

export default async function TeacherAppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const token = await getTokenFromCookie()
  if (!token) redirect('/login')

  let user: TeacherProfile | null = null
  try {
    user = await wpFetch<TeacherProfile>('/auth/me', 'GET', undefined, token)
  } catch {
    redirect('/login')
  }

  if (!user || user.role !== 'teacher') redirect('/profiles')
  if (user.approval_status !== 'approved') redirect('/waiting-approval')

  return <TeacherLayout user={user}>{children}</TeacherLayout>
}
