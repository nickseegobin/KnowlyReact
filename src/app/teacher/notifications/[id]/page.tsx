'use client'

import { useParams } from 'next/navigation'
import NotificationDetail from '@/components/notifications/NotificationDetail'

export default function TeacherNotificationDetailPage() {
  const params = useParams()
  const id = parseInt(params.id as string, 10)

  // Teachers receive simple notifications only (class invites go to parents)
  return <NotificationDetail notificationId={id} canRespond={false} />
}
