'use client'

import { useParams } from 'next/navigation'
import NotificationDetail from '@/components/notifications/NotificationDetail'

export default function ChildNotificationDetailPage() {
  const params = useParams()
  const id = parseInt(params.id as string, 10)

  // Children receive simple (non-actionable) class invite notifications
  return <NotificationDetail notificationId={id} canRespond={false} />
}
