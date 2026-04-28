'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { loadStripe, StripeElementsOptions } from '@stripe/stripe-js'
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'

// ── Inner checkout form ───────────────────────────────────────────────────────

interface CheckoutFormProps {
  orderId: string
  orderKey: string
}

function CheckoutForm({ orderId, orderKey }: CheckoutFormProps) {
  const router   = useRouter()
  const stripe   = useStripe()
  const elements = useElements()

  const [submitting, setSubmitting] = useState(false)
  const [error,      setError]      = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!stripe || !elements) return
    setSubmitting(true)
    setError('')

    const returnUrl = `${window.location.origin}/parent-profile/gems/result?order_id=${orderId}&key=${encodeURIComponent(orderKey)}`

    const { error: stripeError } = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: returnUrl },
    })

    // confirmPayment only returns here on error; on success Stripe redirects
    if (stripeError) {
      setError(stripeError.message ?? 'Payment failed. Please try again.')
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <PaymentElement />

      {error && <p className="text-sm text-error">{error}</p>}

      <button type="submit" disabled={submitting || !stripe} className="btn btn-neutral w-full">
        {submitting
          ? <><span className="loading loading-spinner loading-sm" /> Processing…</>
          : 'Pay Now →'}
      </button>

      <button
        type="button"
        onClick={() => router.back()}
        disabled={submitting}
        className="btn btn-ghost w-full"
      >
        ← Back
      </button>
    </form>
  )
}

// ── Main page — loads intent then renders Elements ────────────────────────────

function PaymentInner() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const orderId      = searchParams.get('order_id') ?? ''
  const orderKey     = searchParams.get('key') ?? ''

  const [clientSecret,    setClientSecret]    = useState('')
  const [publishableKey,  setPublishableKey]  = useState('')
  const [loadError,       setLoadError]       = useState('')

  // Must be called unconditionally before any early returns (Rules of Hooks).
  // Returns null while publishableKey is empty (loading); Elements is never rendered then.
  const stripePromise = useMemo(
    () => (publishableKey ? loadStripe(publishableKey) : null),
    [publishableKey]
  )

  useEffect(() => {
    if (!orderId) { router.replace('/parent-profile/gems'); return }

    fetch(`/api/gems/orders/${orderId}/stripe-intent?key=${encodeURIComponent(orderKey)}`)
      .then((r) => r.json())
      .then((data) => {
        if (!data.client_secret) {
          setLoadError(data.message ?? 'Could not load payment details.')
          return
        }
        setClientSecret(data.client_secret)
        setPublishableKey(data.publishable_key)
      })
      .catch(() => setLoadError('Failed to load payment details. Please try again.'))
  }, [orderId, orderKey, router])

  if (loadError) {
    return (
      <div className="flex flex-col items-center gap-4 py-16 text-center">
        <p className="text-error text-sm">{loadError}</p>
        <button onClick={() => router.back()} className="btn btn-ghost btn-sm">← Go back</button>
      </div>
    )
  }

  if (!clientSecret || !publishableKey) {
    return (
      <div className="flex justify-center py-16">
        <span className="loading loading-spinner loading-lg" />
      </div>
    )
  }

  const options: StripeElementsOptions = {
    clientSecret,
    appearance: { theme: 'stripe' },
  }

  return (
    <div className="max-w-lg mx-auto py-4 flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="btn btn-ghost btn-sm btn-square">←</button>
        <h1 className="text-xl font-bold">Payment</h1>
      </div>

      <div className="bg-base-200 rounded-2xl p-5">
        <p className="text-xs text-base-content/50 mb-4">
          Secured by Stripe · Order #{orderId}
        </p>
        <Elements stripe={stripePromise} options={options}>
          <CheckoutForm orderId={orderId} orderKey={orderKey} />
        </Elements>
      </div>
    </div>
  )
}

export default function PaymentPage() {
  return (
    <Suspense fallback={
      <div className="flex justify-center py-16">
        <span className="loading loading-spinner loading-lg" />
      </div>
    }>
      <PaymentInner />
    </Suspense>
  )
}
