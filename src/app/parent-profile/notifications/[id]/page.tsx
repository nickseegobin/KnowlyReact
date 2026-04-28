'use client'

import { useParams, useRouter } from 'next/navigation'
import NotificationDetail from '@/components/notifications/NotificationDetail'
import { useUnreadCount } from '@/hooks/useUnreadCount'

export default function ParentNotificationDetailPage() {
  const router = useRouter()
  const params = useParams()
  const id = parseInt(params.id as string, 10)
  const { refresh: refreshCount } = useUnreadCount()

  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-3 mb-2">
        <button onClick={() => router.back()} className="btn btn-ghost btn-sm btn-square">
          ←
        </button>
        <h1 className="text-lg font-bold">Notification</h1>
      </div>
      <NotificationDetail
        notificationId={id}
        canRespond={true}
        onRead={refreshCount}
      />
    </div>
  )
}
