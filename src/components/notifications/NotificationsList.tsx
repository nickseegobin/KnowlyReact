'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { KnowlyNotification } from '@/types/knowly'

interface Props {
  /** Base path for notification detail, e.g. "/teacher/notifications" */
  detailBasePath: string
  /** Called after mark-all-read so the badge in the layout can decrement */
  onAllRead?: () => void
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins  = Math.floor(diff / 60_000)
  const hours = Math.floor(diff / 3_600_000)
  const days  = Math.floor(diff / 86_400_000)
  if (mins < 1)   return 'just now'
  if (mins < 60)  return `${mins}m ago`
  if (hours < 24) return `${hours}h ago`
  return `${days}d ago`
}

const SUBJECT_LABELS: Record<string, string> = {
  class_invitation: 'Class Invitation',
}

function subjectLabel(subject: string) {
  return SUBJECT_LABELS[subject] ?? subject.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

export default function NotificationsList({ detailBasePath, onAllRead }: Props) {
  const router = useRouter()
  const [notifications, setNotifications] = useState<KnowlyNotification[]>([])
  const [loading, setLoading] = useState(true)
  const [showAll, setShowAll] = useState(false)
  const [markingAll, setMarkingAll] = useState(false)

  const fetchNotifications = useCallback(async () => {
    setLoading(true)
    try {
      const unreadOnly = showAll ? 'false' : 'false' // always fetch all for the page view
      const res = await fetch(`/api/notifications?unread_only=${unreadOnly}`)
      if (res.ok) {
        const data = await res.json()
        setNotifications(data.notifications ?? [])
      }
    } catch { /* keep */ }
    finally { setLoading(false) }
  }, [showAll])

  useEffect(() => { fetchNotifications() }, [fetchNotifications])

  async function markAllRead() {
    setMarkingAll(true)
    try {
      await fetch('/api/notifications/read-all', { method: 'POST' })
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
      onAllRead?.()
    } catch { /* ignore */ }
    finally { setMarkingAll(false) }
  }

  function openNotification(n: KnowlyNotification) {
    // Mark as read optimistically
    if (!n.is_read) {
      fetch(`/api/notifications/${n.id}/read`, { method: 'POST' }).catch(() => {})
      setNotifications((prev) => prev.map((x) => x.id === n.id ? { ...x, is_read: true } : x))
      onAllRead?.() // trigger badge refresh
    }
    router.push(`${detailBasePath}/${n.id}`)
  }

  const unreadCount = notifications.filter((n) => !n.is_read).length
  const displayed   = showAll ? notifications : notifications.filter((n) => !n.is_read)

  return (
    <div className="max-w-sm mx-auto w-full px-4 py-6 flex flex-col gap-4">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Notifications</h1>
          <p className="text-sm text-base-content/50">
            {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            disabled={markingAll}
            className="btn btn-xs btn-ghost text-base-content/50"
          >
            {markingAll ? <span className="loading loading-spinner loading-xs" /> : 'Mark all read'}
          </button>
        )}
      </div>

      {/* ── Filter toggle ── */}
      <div className="tabs tabs-boxed self-start">
        <button
          className={`tab ${!showAll ? 'tab-active' : ''}`}
          onClick={() => setShowAll(false)}
        >
          Unread
        </button>
        <button
          className={`tab ${showAll ? 'tab-active' : ''}`}
          onClick={() => setShowAll(true)}
        >
          All
        </button>
      </div>

      {/* ── List ── */}
      {loading ? (
        <div className="flex justify-center py-10">
          <span className="loading loading-spinner loading-md" />
        </div>
      ) : displayed.length === 0 ? (
        <div className="bg-base-200 rounded-2xl p-8 text-center text-sm text-base-content/50">
          {showAll ? 'No notifications yet.' : 'No unread notifications.'}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {displayed.map((n) => (
            <button
              key={n.id}
              onClick={() => openNotification(n)}
              className={`rounded-2xl px-4 py-3 text-left transition-colors flex items-start gap-3 ${
                n.is_read ? 'bg-base-200 hover:bg-base-300' : 'bg-base-200 border border-primary/30 hover:bg-base-300'
              }`}
            >
              {/* Unread dot */}
              <div className="mt-1.5 shrink-0">
                {n.is_read
                  ? <div className="w-2 h-2 rounded-full bg-base-300" />
                  : <div className="w-2 h-2 rounded-full bg-primary" />
                }
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-0.5">
                  <span className="text-xs font-semibold text-base-content/60 uppercase tracking-wide">
                    {subjectLabel(n.subject)}
                  </span>
                  <span className="text-xs text-base-content/40 shrink-0">{timeAgo(n.created_at)}</span>
                </div>
                <p className="text-sm leading-snug">{n.message}</p>
                {n.type === 'confirmation' && n.response === null && (
                  <span className="mt-1 inline-block badge badge-sm badge-warning">Action required</span>
                )}
                {n.response === 'accepted' && (
                  <span className="mt-1 inline-block badge badge-sm badge-success">Accepted</span>
                )}
                {n.response === 'declined' && (
                  <span className="mt-1 inline-block badge badge-sm badge-error">Declined</span>
                )}
              </div>

              <span className="text-base-content/30 mt-1">›</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
