'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
// payment_url kept in PendingOrder so sessionStorage shape stays consistent

interface PendingOrder {
  order_id: number
  order_key: string
  payment_url: string
  gem_quantity: number
  total: string
  currency: string
  product_name: string
}

export default function ConfirmPage() {
  const router = useRouter()
  const [order, setOrder] = useState<PendingOrder | null>(null)

  useEffect(() => {
    const raw = sessionStorage.getItem('knowly_pending_order')
    if (!raw) { router.replace('/parent-profile/gems'); return }
    try {
      setOrder(JSON.parse(raw) as PendingOrder)
    } catch {
      router.replace('/parent-profile/gems')
    }
  }, [router])

  function handlePay() {
    if (!order) return
    sessionStorage.removeItem('knowly_pending_order')
    router.push(`/parent-profile/gems/payment?order_id=${order.order_id}&key=${encodeURIComponent(order.order_key)}`)
  }

  if (!order) {
    return (
      <div className="flex justify-center py-16">
        <span className="loading loading-spinner loading-lg" />
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto py-4 flex flex-col gap-6">

      {/* Back + title */}
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="btn btn-ghost btn-sm btn-square">←</button>
        <h1 className="text-xl font-bold">Confirm Order</h1>
      </div>

      {/* Order summary card */}
      <div className="bg-base-200 rounded-2xl p-5 flex flex-col gap-4">
        <h2 className="font-semibold">Order Summary</h2>

        <div className="flex items-center gap-4 pb-4 border-b border-base-300">
          <div className="flex flex-col items-center justify-center w-16 h-16 bg-blue-100 rounded-xl shrink-0">
            <Image src="/icons/blue-gem.png" alt="gems" width={28} height={28} />
            <span className="text-xs font-bold text-blue-700 mt-0.5">{order.gem_quantity}</span>
          </div>
          <div className="flex-1">
            <p className="font-semibold">{order.product_name}</p>
            <p className="text-xs text-base-content/50 mt-0.5">
              Blue Gems · added to your wallet after payment clears
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-2 text-sm">
          <div className="flex justify-between">
            <span className="text-base-content/60">Order #</span>
            <span className="font-mono">{order.order_id}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-base-content/60">Total</span>
            <span className="text-xl font-bold">{order.currency} {order.total}</span>
          </div>
        </div>
      </div>

      <p className="text-sm text-base-content/50 text-center px-4">
        You&apos;ll enter your card details on the next page. Payment is processed securely by Stripe.
      </p>

      <div className="flex flex-col gap-3">
        <button onClick={handlePay} className="btn btn-neutral w-full">
          Confirm & Pay →
        </button>
        <button
          onClick={() => router.replace('/parent-profile/gems')}
          className="btn btn-ghost w-full"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
