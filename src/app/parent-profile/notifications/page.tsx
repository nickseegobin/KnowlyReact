'use client'

import { useRouter } from 'next/navigation'
import NotificationsList from '@/components/notifications/NotificationsList'
import { useUnreadCount } from '@/hooks/useUnreadCount'

export default function ParentNotificationsPage() {
  const router = useRouter()
  const { setUnread } = useUnreadCount()

  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-3 mb-2">
        <button onClick={() => router.back()} className="btn btn-ghost btn-sm btn-square">
          ←
        </button>
        <h1 className="text-lg font-bold">Notifications</h1>
      </div>
      <NotificationsList
        detailBasePath="/parent-profile/notifications"
        onAllRead={() => setUnread(0)}
      />
    </div>
  )
}
