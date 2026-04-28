'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'

interface GemOrder {
  order_id: number
  status: string
  date_created: string | null
  total: string
  currency: string
  gem_quantity: number
  gems_granted: number
  product_name: string
}

const STATUS_STYLES: Record<string, { label: string; className: string }> = {
  completed:  { label: 'Completed',  className: 'badge-success' },
  processing: { label: 'Processing', className: 'badge-warning' },
  pending:    { label: 'Pending',    className: 'badge-ghost' },
  'on-hold':  { label: 'On Hold',    className: 'badge-ghost' },
  cancelled:  { label: 'Cancelled',  className: 'badge-error' },
  failed:     { label: 'Failed',     className: 'badge-error' },
  refunded:   { label: 'Refunded',   className: 'badge-neutral' },
}

function statusBadge(status: string) {
  const s = STATUS_STYLES[status] ?? { label: status, className: 'badge-ghost' }
  return <span className={`badge badge-sm ${s.className}`}>{s.label}</span>
}

function formatDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

export default function OrdersPage() {
  const router = useRouter()
  const [orders,  setOrders]  = useState<GemOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState('')

  useEffect(() => {
    fetch('/api/gems/orders')
      .then((r) => r.json())
      .then((data) => {
        if (data.message) { setError(data.message); return }
        setOrders(data.orders ?? [])
      })
      .catch(() => setError('Failed to load orders.'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <span className="loading loading-spinner loading-lg" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center gap-4 py-16 text-center">
        <p className="text-error text-sm">{error}</p>
        <button onClick={() => window.location.reload()} className="btn btn-ghost btn-sm">Retry</button>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto py-4 flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="btn btn-ghost btn-sm btn-square">←</button>
        <h1 className="text-xl font-bold">Order History</h1>
      </div>

      {orders.length === 0 ? (
        <div className="bg-base-200 rounded-2xl p-10 text-center flex flex-col items-center gap-3">
          <Image src="/icons/blue-gem.png" alt="gems" width={40} height={40} className="opacity-30" />
          <p className="text-base-content/50 text-sm">No orders yet.</p>
          <Link href="/parent-profile/gems" className="btn btn-neutral btn-sm mt-1">Shop Gems</Link>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {orders.map((order) => (
            <div key={order.order_id} className="bg-base-200 rounded-2xl p-4 flex items-center gap-4">
              {/* Gem icon */}
              <div className="flex flex-col items-center justify-center w-14 h-14 bg-blue-100 rounded-xl shrink-0">
                <Image src="/icons/blue-gem.png" alt="gems" width={22} height={22} />
                <span className="text-xs font-bold text-blue-700 mt-0.5">{order.gem_quantity}</span>
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-sm truncate">{order.product_name || `Order #${order.order_id}`}</p>
                  {statusBadge(order.status)}
                </div>
                <p className="text-xs text-base-content/50 mt-0.5">
                  #{order.order_id} · {formatDate(order.date_created)}
                </p>
                {order.gems_granted > 0 && (
                  <p className="text-xs text-success mt-0.5">+{order.gems_granted} gems credited</p>
                )}
              </div>

              {/* Total */}
              <div className="text-right shrink-0">
                <p className="font-bold text-sm">{order.currency} {order.total}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
