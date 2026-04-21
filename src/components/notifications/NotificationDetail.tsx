'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { KnowlyNotification } from '@/types/knowly'

interface Props {
  notificationId: number
  /** Whether this role can respond to confirmation notifications (parent only) */
  canRespond?: boolean
  /** Called after respond/read so layout badge refreshes */
  onRead?: () => void
}

interface ClassInvitationPayload {
  class_id: number
  class_name: string
  child_id: number
  child_nickname?: string
  teacher_name: string
  school_name?: string
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

export default function NotificationDetail({ notificationId, canRespond = false, onRead }: Props) {
  const router = useRouter()
  const [notif, setNotif] = useState<KnowlyNotification | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [responding, setResponding] = useState<'accepted' | 'declined' | null>(null)
  const [responseError, setResponseError] = useState('')

  const fetch_ = useCallback(async () => {
    setLoading(true)
    try {
      // Fetch all notifications and find by id (no single-get proxy needed)
      const res = await fetch('/api/notifications?unread_only=false&limit=100')
      if (!res.ok) { setError('Failed to load notification.'); return }
      const data = await res.json()
      const found = (data.notifications ?? []).find((n: KnowlyNotification) => n.id === notificationId)
      if (!found) { setError('Notification not found.'); return }
      setNotif(found)

      // Mark as read silently
      if (!found.is_read) {
        fetch(`/api/notifications/${notificationId}/read`, { method: 'POST' }).catch(() => {})
        onRead?.()
      }
    } catch {
      setError('Something went wrong.')
    } finally {
      setLoading(false)
    }
  }, [notificationId, onRead])

  useEffect(() => { fetch_() }, [fetch_])

  async function respond(response: 'accepted' | 'declined') {
    if (!notif) return
    setResponseError('')
    setResponding(response)
    try {
      const res = await fetch(`/api/notifications/${notif.id}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ response }),
      })
      const data = await res.json()
      if (!res.ok) {
        setResponseError(data.message ?? 'Failed to respond.')
      } else {
        setNotif((prev) => prev ? { ...prev, response, is_read: true } : prev)
        onRead?.()
      }
    } catch {
      setResponseError('Something went wrong.')
    } finally {
      setResponding(null)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <span className="loading loading-spinner loading-md" />
      </div>
    )
  }

  if (error || !notif) {
    return (
      <div className="max-w-sm mx-auto px-4 py-8 text-center text-sm text-error">
        {error || 'Notification not found.'}
      </div>
    )
  }

  const isClassInvite = notif.subject === 'class_invitation'
  const payload = notif.payload as ClassInvitationPayload | null
  const alreadyResponded = notif.response !== null

  return (
    <div className="max-w-sm mx-auto w-full px-4 py-6 flex flex-col gap-5">
      {/* ── Header ── */}
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="text-base-content/50 hover:text-base-content">
          ←
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-bold">
            {notif.subject === 'class_invitation' ? 'Class Invitation' : notif.subject.replace(/_/g, ' ')}
          </h1>
          <p className="text-xs text-base-content/50">{timeAgo(notif.created_at)}</p>
        </div>
        {!notif.is_read && (
          <span className="badge badge-sm badge-primary">New</span>
        )}
      </div>

      {/* ── Message ── */}
      <div className="bg-base-200 rounded-2xl p-4">
        <p className="text-sm leading-relaxed">{notif.message}</p>
      </div>

      {/* ── Class Invitation Detail ── */}
      {isClassInvite && payload && (
        <div className="flex flex-col gap-3">
          {/* Teacher info */}
          <div className="bg-base-200 rounded-2xl p-4">
            <p className="text-xs font-semibold text-base-content/50 uppercase tracking-wide mb-3">
              Teacher Details
            </p>
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between text-sm">
                <span className="text-base-content/60">Name</span>
                <span className="font-semibold">{payload.teacher_name}</span>
              </div>
              {payload.school_name && (
                <div className="flex justify-between text-sm">
                  <span className="text-base-content/60">School</span>
                  <span className="font-semibold">{payload.school_name}</span>
                </div>
              )}
            </div>
          </div>

          {/* Class info */}
          <div className="bg-base-200 rounded-2xl p-4">
            <p className="text-xs font-semibold text-base-content/50 uppercase tracking-wide mb-3">
              Class Details
            </p>
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between text-sm">
                <span className="text-base-content/60">Class</span>
                <span className="font-semibold">{payload.class_name}</span>
              </div>
              {payload.child_nickname && (
                <div className="flex justify-between text-sm">
                  <span className="text-base-content/60">Student</span>
                  <span className="font-semibold">{payload.child_nickname}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Response status ── */}
      {notif.type === 'confirmation' && alreadyResponded && (
        <div className={`rounded-2xl p-4 text-center ${
          notif.response === 'accepted' ? 'bg-success/10 text-success' : 'bg-error/10 text-error'
        }`}>
          <p className="font-semibold text-sm">
            {notif.response === 'accepted' ? '✓ Invitation accepted' : '✗ Invitation declined'}
          </p>
          {notif.responded_at && (
            <p className="text-xs mt-0.5 opacity-70">{timeAgo(notif.responded_at)}</p>
          )}
        </div>
      )}

      {/* ── Confirmation actions (parent only, not yet responded) ── */}
      {notif.type === 'confirmation' && !alreadyResponded && canRespond && (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-base-content/60 text-center">
            Would you like to accept this class invitation?
          </p>
          {responseError && <p className="text-error text-xs text-center">{responseError}</p>}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => respond('declined')}
              disabled={responding !== null}
              className="btn btn-outline btn-error"
            >
              {responding === 'declined'
                ? <span className="loading loading-spinner loading-xs" />
                : 'Decline'}
            </button>
            <button
              onClick={() => respond('accepted')}
              disabled={responding !== null}
              className="btn btn-neutral"
            >
              {responding === 'accepted'
                ? <span className="loading loading-spinner loading-xs" />
                : 'Accept'}
            </button>
          </div>
        </div>
      )}

      {/* ── Non-parent seeing a confirmation ── */}
      {notif.type === 'confirmation' && !alreadyResponded && !canRespond && (
        <div className="bg-base-200 rounded-2xl p-4 text-center text-sm text-base-content/50">
          Your parent will review and respond to this invitation.
        </div>
      )}
    </div>
  )
}
