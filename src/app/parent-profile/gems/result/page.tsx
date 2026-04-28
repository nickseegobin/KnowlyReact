'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'

type OrderStatus = 'pending' | 'processing' | 'on-hold' | 'completed' | 'cancelled' | 'refunded' | 'failed'

interface OrderResult {
  order_id: number
  status: OrderStatus
  gems_granted: number
  total: string
  currency: string
}

const POLL_INTERVAL_MS = 3000
const MAX_POLLS        = 100  // ~5 minutes

function PurchaseResultInner() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const orderId        = searchParams.get('order_id')
  const orderKey       = searchParams.get('key')
  const redirectStatus = searchParams.get('redirect_status') // appended by Stripe after confirmPayment

  const [result,   setResult]   = useState<OrderResult | null>(null)
  const [error,    setError]    = useState('')
  const [timedOut, setTimedOut] = useState(false)
  const pollCount  = useRef(0)
  const timer      = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const gemSynced  = useRef(false)

  useEffect(() => {
    if (!orderId || !orderKey) {
      router.replace('/parent-profile/gems')
      return
    }

    // Stripe appends redirect_status=failed or redirect_status=canceled when payment doesn't succeed.
    // Show the failure state immediately rather than polling until timeout.
    if (redirectStatus && redirectStatus !== 'succeeded') {
      const status = redirectStatus === 'canceled' ? 'cancelled' : 'failed'
      setResult({ order_id: parseInt(orderId), status: status as OrderStatus, gems_granted: 0, total: '', currency: '' })
      return
    }

    async function poll() {
      try {
        const res  = await fetch(`/api/gems/orders/${orderId}?key=${encodeURIComponent(orderKey!)}`)
        const data: OrderResult = await res.json()

        if (!res.ok) {
          setError((data as { message?: string }).message ?? 'Could not load order.')
          return
        }

        // Keep polling while payment is unconfirmed or confirmed-but-not-yet-fulfilled.
        // pending/on-hold: keep result null so the "Confirming Payment" spinner shows.
        // processing: set result so the "Payment Received" clock shows (polling continues).
        // In production, virtual products auto-complete within seconds via Stripe webhook.
        if (data.status === 'pending' || data.status === 'on-hold' || data.status === 'processing') {
          if (data.status === 'processing') setResult(data)
          pollCount.current += 1
          if (pollCount.current >= MAX_POLLS) { setTimedOut(true); return }
          timer.current = setTimeout(poll, POLL_INTERVAL_MS)
          return
        }

        // Terminal status reached — stop polling
        setResult(data)

        // Sync header gem balance once when gems are credited (completed)
        if (data.status === 'completed' && data.gems_granted > 0 && !gemSynced.current) {
          gemSynced.current = true
          fetch('/api/gems?scope=parent')
            .then((r) => r.json())
            .then((d) => {
              const balance = d.balance ?? d.blue_gem_balance
              if (typeof balance === 'number') {
                window.dispatchEvent(new CustomEvent('knowly:gem-update', { detail: { balance } }))
              }
            })
            .catch(() => {})
        }
      } catch {
        setError('Connection error. Please refresh the page.')
      }
    }

    poll()
    return () => clearTimeout(timer.current)
  }, [orderId, orderKey, redirectStatus, router])

  // ── Timed out waiting for payment confirmation ──
  if (timedOut) {
    return (
      <div className="max-w-sm mx-auto flex flex-col items-center gap-6 py-12 text-center">
        <div className="text-5xl">⏳</div>
        <h1 className="text-xl font-bold">Payment Pending</h1>
        <p className="text-sm text-base-content/50">
          Your payment hasn&apos;t been confirmed yet. Check your email for a confirmation or try again shortly.
        </p>
        <Link href="/parent-profile/gems" className="btn btn-neutral w-full">Back to Shop</Link>
        <Link href="/parent-profile" className="btn btn-ghost w-full">Home</Link>
      </div>
    )
  }

  // ── Error ──
  if (error) {
    return (
      <div className="max-w-sm mx-auto flex flex-col items-center gap-6 py-12 text-center">
        <div className="text-5xl">⚠️</div>
        <h1 className="text-xl font-bold">Something went wrong</h1>
        <p className="text-sm text-error">{error}</p>
        <Link href="/parent-profile/gems" className="btn btn-neutral w-full">Back to Shop</Link>
      </div>
    )
  }

  // ── Polling / waiting for confirmation ──
  if (!result) {
    return (
      <div className="max-w-sm mx-auto flex flex-col items-center gap-6 py-12 text-center">
        <span className="loading loading-spinner loading-lg text-primary" />
        <h1 className="text-xl font-bold">Confirming Payment</h1>
        <p className="text-sm text-base-content/50">
          Please wait while we confirm your payment. Don&apos;t close this page.
        </p>
      </div>
    )
  }

  // ── Payment confirmed, order being fulfilled ──
  if (result.status === 'processing') {
    return (
      <div className="max-w-sm mx-auto flex flex-col items-center gap-6 py-12 text-center">
        <div className="w-20 h-20 rounded-full bg-warning/10 flex items-center justify-center">
          <span className="text-4xl">🕐</span>
        </div>
        <h1 className="text-2xl font-bold">Payment Received</h1>
        <p className="text-sm text-base-content/60">
          Your payment has been confirmed. Your Blue Gems will be added to your wallet once your order is completed.
          You&apos;ll receive a notification when they&apos;re ready.
        </p>
        <p className="text-xs text-base-content/40">
          Order #{result.order_id} · {result.currency} {result.total}
        </p>
        <Link href="/parent-profile" className="btn btn-neutral w-full">Go to Home</Link>
        <Link href="/parent-profile/gems" className="btn btn-ghost w-full">Buy More Gems</Link>
      </div>
    )
  }

  // ── Completed — gems credited ──
  if (result.status === 'completed') {
    return (
      <div className="max-w-sm mx-auto flex flex-col items-center gap-6 py-12 text-center">
        <div className="w-20 h-20 rounded-full bg-success/10 flex items-center justify-center">
          <span className="text-4xl">✅</span>
        </div>
        <h1 className="text-2xl font-bold">Payment Successful!</h1>
        <div className="flex flex-col items-center gap-2">
          <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-full px-6 py-2">
            <Image src="/icons/blue-gem.png" alt="gems" width={24} height={24} />
            <span className="text-2xl font-bold text-blue-700">+{result.gems_granted}</span>
          </div>
          <p className="text-sm text-base-content/50">Blue Gems added to your wallet</p>
        </div>
        <p className="text-xs text-base-content/40">
          Order #{result.order_id} · {result.currency} {result.total}
        </p>
        <Link href="/parent-profile" className="btn btn-neutral w-full">Go to Home</Link>
        <Link href="/parent-profile/gems" className="btn btn-ghost w-full">Buy More Gems</Link>
      </div>
    )
  }

  // ── Cancelled / Failed ──
  return (
    <div className="max-w-sm mx-auto flex flex-col items-center gap-6 py-12 text-center">
      <div className="w-20 h-20 rounded-full bg-error/10 flex items-center justify-center">
        <span className="text-4xl">❌</span>
      </div>
      <h1 className="text-2xl font-bold">
        Payment {result.status === 'cancelled' ? 'Cancelled' : 'Failed'}
      </h1>
      <p className="text-sm text-base-content/50">
        {result.status === 'cancelled'
          ? 'Your payment was cancelled. No charges were made.'
          : 'Your payment could not be processed. Please try again or use a different payment method.'}
      </p>
      <Link href="/parent-profile/gems" className="btn btn-neutral w-full">Try Again</Link>
      <Link href="/parent-profile" className="btn btn-ghost w-full">Home</Link>
    </div>
  )
}

export default function PurchaseResultPage() {
  return (
    <Suspense fallback={
      <div className="max-w-sm mx-auto flex flex-col items-center gap-6 py-12 text-center">
        <span className="loading loading-spinner loading-lg text-primary" />
        <h1 className="text-xl font-bold">Confirming Payment</h1>
        <p className="text-sm text-base-content/50">
          Please wait while we confirm your payment. Don&apos;t close this page.
        </p>
      </div>
    }>
      <PurchaseResultInner />
    </Suspense>
  )
}
