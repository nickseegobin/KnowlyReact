'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'

interface GemProduct {
  id: number
  name: string
  price: string
  currency_symbol: string
  gem_quantity: number
}

interface BillingForm {
  first_name: string
  last_name: string
  email: string
  phone: string
  address_1: string
  city: string
  state: string
  postcode: string
  country: string
}

const EMPTY_BILLING: BillingForm = {
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  address_1: '',
  city: '',
  state: '',
  postcode: '',
  country: 'TT',
}

function BillingInner() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const productId    = searchParams.get('product_id')

  const [product,        setProduct]        = useState<GemProduct | null>(null)
  const [loadingProduct, setLoadingProduct] = useState(true)
  const [loadingBilling, setLoadingBilling] = useState(true)
  const [submitting,     setSubmitting]     = useState(false)
  const [error,          setError]          = useState('')
  const [billing,        setBilling]        = useState<BillingForm>(EMPTY_BILLING)

  // Load selected product
  useEffect(() => {
    if (!productId) { router.replace('/parent-profile/gems'); return }

    fetch('/api/gems/products')
      .then((r) => r.json())
      .then((data) => {
        const products: GemProduct[] = data.products ?? []
        const found = products.find((p) => p.id === parseInt(productId))
        if (!found) { router.replace('/parent-profile/gems'); return }
        setProduct(found)
      })
      .catch(() => setError('Failed to load product.'))
      .finally(() => setLoadingProduct(false))
  }, [productId, router])

  // Load saved billing address
  useEffect(() => {
    fetch('/api/user/billing')
      .then((r) => r.json())
      .then((data) => {
        const b = data.billing ?? {}
        setBilling({
          first_name: b.first_name ?? '',
          last_name:  b.last_name  ?? '',
          email:      b.email      ?? '',
          phone:      b.phone      ?? '',
          address_1:  b.address_1  ?? '',
          city:       b.city       ?? '',
          state:      b.state      ?? '',
          postcode:   b.postcode   ?? '',
          country:    b.country    || 'TT',
        })
      })
      .catch(() => {})
      .finally(() => setLoadingBilling(false))
  }, [])

  function field(key: keyof BillingForm) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setBilling((b) => ({ ...b, [key]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!product) return
    setSubmitting(true)
    setError('')

    const returnUrl = `${window.location.origin}/parent-profile/gems/result`

    try {
      const res = await fetch('/api/gems/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: product.id,
          quantity:   1,
          billing,
          return_url: returnUrl,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.message ?? 'Failed to create order. Please try again.')
        setSubmitting(false)
        return
      }

      sessionStorage.setItem('knowly_pending_order', JSON.stringify({
        order_id:     data.order_id,
        order_key:    data.order_key,
        payment_url:  data.payment_url,
        gem_quantity: data.gem_quantity,
        total:        data.total,
        currency:     data.currency,
        product_name: product.name,
      }))

      router.push(
        `/parent-profile/gems/confirm?order_id=${data.order_id}&key=${encodeURIComponent(data.order_key)}`
      )
    } catch {
      setError('Something went wrong. Please try again.')
      setSubmitting(false)
    }
  }

  if (loadingProduct || loadingBilling) {
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
        <h1 className="text-xl font-bold">Billing Details</h1>
      </div>

      {/* Selected product */}
      {product && (
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex items-center gap-4">
          <div className="flex flex-col items-center justify-center w-14 h-14 bg-blue-100 rounded-xl shrink-0">
            <Image src="/icons/blue-gem.png" alt="gems" width={24} height={24} />
            <span className="text-xs font-bold text-blue-700 mt-0.5">{product.gem_quantity}</span>
          </div>
          <div>
            <p className="font-semibold">{product.name}</p>
            <p className="text-sm font-bold text-blue-700">
              {product.currency_symbol}{product.price}
            </p>
          </div>
        </div>
      )}

      {/* Billing form */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <h2 className="font-semibold">Billing Information</h2>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-base-content/60">First Name *</label>
            <input required className="input input-bordered input-sm" value={billing.first_name} onChange={field('first_name')} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-base-content/60">Last Name *</label>
            <input required className="input input-bordered input-sm" value={billing.last_name} onChange={field('last_name')} />
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-base-content/60">Email *</label>
          <input required type="email" className="input input-bordered input-sm" value={billing.email} onChange={field('email')} />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-base-content/60">Phone</label>
          <input type="tel" className="input input-bordered input-sm" value={billing.phone} onChange={field('phone')} placeholder="+1 868 000 0000" />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-base-content/60">Address *</label>
          <input required className="input input-bordered input-sm" value={billing.address_1} onChange={field('address_1')} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-base-content/60">City *</label>
            <input required className="input input-bordered input-sm" value={billing.city} onChange={field('city')} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-base-content/60">Postcode</label>
            <input className="input input-bordered input-sm" value={billing.postcode} onChange={field('postcode')} />
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-base-content/60">Country *</label>
          <input required className="input input-bordered input-sm" value={billing.country} onChange={field('country')} placeholder="TT" />
        </div>

        {error && <p className="text-sm text-error">{error}</p>}

        <button type="submit" disabled={submitting} className="btn btn-neutral w-full mt-2">
          {submitting
            ? <span className="loading loading-spinner loading-sm" />
            : 'Review Order →'}
        </button>
      </form>
    </div>
  )
}

export default function BillingPage() {
  return (
    <Suspense fallback={
      <div className="flex justify-center py-16">
        <span className="loading loading-spinner loading-lg" />
      </div>
    }>
      <BillingInner />
    </Suspense>
  )
}
