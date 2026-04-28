'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'

interface GemProduct {
  id: number
  name: string
  description: string
  price: string
  price_html: string
  currency_symbol: string
  gem_quantity: number
  image_url: string | null
}

export default function GemShopPage() {
  const router = useRouter()
  const [products, setProducts] = useState<GemProduct[]>([])
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState('')

  useEffect(() => {
    fetch('/api/gems/products')
      .then((r) => r.json())
      .then((data) => setProducts(data.products ?? []))
      .catch(() => setError('Failed to load gem products.'))
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
    <div className="max-w-lg mx-auto flex flex-col gap-6 py-4">
      <div>
        <h1 className="text-2xl font-bold">Gem Shop</h1>
        <p className="text-sm text-base-content/50 mt-1">Top up your Blue Gem wallet to power learning activities</p>
      </div>

      {products.length === 0 ? (
        <div className="bg-base-200 rounded-2xl p-8 text-center">
          <Image src="/icons/blue-gem.png" alt="gems" width={40} height={40} className="mx-auto mb-3 opacity-40" />
          <p className="text-base-content/50 text-sm">No gem packages available right now.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {products.map((product) => (
            <div key={product.id} className="bg-base-200 rounded-2xl p-5 flex items-center gap-4">
              {/* Gem icon + count */}
              <div className="flex flex-col items-center justify-center w-16 h-16 bg-blue-100 rounded-xl shrink-0">
                <Image src="/icons/blue-gem.png" alt="gems" width={28} height={28} />
                <span className="text-xs font-bold text-blue-700 mt-0.5">{product.gem_quantity}</span>
              </div>

              {/* Name + description + price */}
              <div className="flex-1 min-w-0">
                <p className="font-semibold">{product.name}</p>
                {product.description && (
                  <p className="text-xs text-base-content/50 mt-0.5 truncate">{product.description}</p>
                )}
                <p className="text-sm font-bold text-blue-700 mt-1">
                  {product.currency_symbol}{product.price}
                </p>
              </div>

              <Link
                href={`/parent-profile/gems/billing?product_id=${product.id}`}
                className="btn btn-neutral btn-sm shrink-0"
              >
                Buy
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
