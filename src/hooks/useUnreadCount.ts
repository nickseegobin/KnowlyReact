'use client'

import { useCallback, useEffect, useState } from 'react'

const POLL_INTERVAL_MS = 60_000

/**
 * Polls /api/notifications/count every 60 seconds.
 * Returns the current unread count and a manual refresh function.
 *
 * Per spec: polling must be paused during active Trial sessions (Block 9).
 * Pass `pause={true}` to suspend polling without unmounting.
 */
export function useUnreadCount(pause = false) {
  const [unread, setUnread] = useState(0)

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications/count')
      if (res.ok) {
        const data = await res.json()
        setUnread(data.unread ?? 0)
      }
    } catch { /* keep current value */ }
  }, [])

  // Initial fetch
  useEffect(() => {
    if (!pause) refresh()
  }, [pause, refresh])

  // 60-second polling
  useEffect(() => {
    if (pause) return
    const id = setInterval(refresh, POLL_INTERVAL_MS)
    return () => clearInterval(id)
  }, [pause, refresh])

  // Refresh on tab visibility regain
  useEffect(() => {
    function onVisible() {
      if (!pause && document.visibilityState === 'visible') refresh()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [pause, refresh])

  return { unread, refresh, setUnread }
}
