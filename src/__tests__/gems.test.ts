/**
 * Tests for gem proxy routes:
 *   GET  /api/gems          (balance)
 *   GET  /api/gems/costs
 *   GET  /api/gems/products
 *   GET  /api/gems/orders
 *   GET  /api/gems/orders/[order_id]
 *   POST /api/gems/orders/[order_id]/stripe-intent
 */

import { NextRequest } from 'next/server'

const mockWpFetch = jest.fn()
const mockGetToken = jest.fn()

jest.mock('@/lib/wp-api', () => ({
  wpFetch: (...args: unknown[]) => mockWpFetch(...args),
  WPApiError: class WPApiError extends Error {
    code: string
    status: number
    constructor(code: string, message: string, status: number) {
      super(message)
      this.code = code
      this.status = status
    }
  },
}))

jest.mock('@/lib/cookies', () => ({
  getTokenFromCookie: () => mockGetToken(),
}))

import { GET as getBalance }      from '@/app/api/gems/route'
import { GET as getCosts }        from '@/app/api/gems/costs/route'
import { GET as getProducts }     from '@/app/api/gems/products/route'
import { GET as getOrders }       from '@/app/api/gems/orders/route'
import { GET as getOrder }        from '@/app/api/gems/orders/[order_id]/route'
import { GET as stripeIntent }    from '@/app/api/gems/orders/[order_id]/stripe-intent/route'
import { WPApiError }             from '@/lib/wp-api'

// ── Fixtures ──────────────────────────────────────────────────────────────────

const BALANCE = { balance: 15, lifetime_earned: 42 }

const COSTS = {
  trial:        { easy: 0, medium: 0, hard: 0 },
  quest_first:  3,
  quest_retake: 1,
  lesson:       3,
}

const PRODUCTS = [
  { product_id: 101, name: '10 Gems', gems: 10, price: '4.99', currency: 'USD' },
  { product_id: 102, name: '30 Gems', gems: 30, price: '9.99', currency: 'USD' },
]

const ORDERS = [
  { order_id: 'ord-1', gems: 10, status: 'completed', created_at: '2026-05-01 10:00:00' },
]

const ORDER_DETAIL = { order_id: 'ord-1', gems: 10, status: 'completed', stripe_payment_intent: 'pi_xxx' }

const STRIPE_INTENT = { client_secret: 'pi_xxx_secret', payment_intent_id: 'pi_xxx' }

function makeGet(url: string): NextRequest {
  return new NextRequest(`http://localhost${url}`)
}

function makePost(url: string, body: unknown = {}): NextRequest {
  return new NextRequest(`http://localhost${url}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function orderParams(order_id: string) {
  return { params: Promise.resolve({ order_id }) }
}

// ── GET /api/gems (balance) ───────────────────────────────────────────────────

describe('GET /api/gems', () => {
  it('returns 401 when unauthenticated', async () => {
    mockGetToken.mockResolvedValue(null)
    const res = await getBalance(makeGet('/api/gems'))
    expect(res.status).toBe(401)
    expect(mockWpFetch).not.toHaveBeenCalled()
  })

  it('returns gem balance', async () => {
    mockGetToken.mockResolvedValue('jwt')
    mockWpFetch.mockResolvedValue(BALANCE)
    const res = await getBalance(makeGet('/api/gems'))
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.balance).toBe(15)
    expect(body.lifetime_earned).toBe(42)
  })

  it('returns 500 on unexpected error', async () => {
    mockGetToken.mockResolvedValue('jwt')
    mockWpFetch.mockRejectedValue(new Error('crash'))
    const res = await getBalance(makeGet('/api/gems'))
    expect(res.status).toBe(500)
  })
})

// ── GET /api/gems/costs ───────────────────────────────────────────────────────

describe('GET /api/gems/costs', () => {
  it('returns gem cost map without auth (public endpoint)', async () => {
    mockWpFetch.mockResolvedValue(COSTS)
    const res = await getCosts()
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.quest_first).toBe(3)
    expect(body.quest_retake).toBe(1)
    expect(body.lesson).toBe(3)
    expect(body.trial).toEqual({ easy: 0, medium: 0, hard: 0 })
  })

  it('returns WPApiError on failure', async () => {
    mockWpFetch.mockRejectedValue(new WPApiError('knowly_server_error', 'Server error', 500))
    const res = await getCosts()
    expect(res.status).toBe(500)
  })

  it('returns 500 on unexpected error', async () => {
    mockWpFetch.mockRejectedValue(new Error('crash'))
    const res = await getCosts()
    expect(res.status).toBe(500)
  })
})

// ── GET /api/gems/products ────────────────────────────────────────────────────

describe('GET /api/gems/products', () => {
  it('returns product list without auth (public endpoint)', async () => {
    mockWpFetch.mockResolvedValue({ products: PRODUCTS })
    const res = await getProducts()
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.products).toHaveLength(2)
    expect(body.products[0].gems).toBe(10)
  })

  it('returns 500 on unexpected error', async () => {
    mockWpFetch.mockRejectedValue(new Error('crash'))
    const res = await getProducts()
    expect(res.status).toBe(500)
  })
})

// ── GET /api/gems/orders ──────────────────────────────────────────────────────

describe('GET /api/gems/orders', () => {
  it('returns 401 when unauthenticated', async () => {
    mockGetToken.mockResolvedValue(null)
    const res = await getOrders(makeGet('/api/gems/orders'))
    expect(res.status).toBe(401)
  })

  it('returns order history', async () => {
    mockGetToken.mockResolvedValue('jwt')
    mockWpFetch.mockResolvedValue({ orders: ORDERS })
    const res = await getOrders(makeGet('/api/gems/orders'))
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.orders).toHaveLength(1)
    expect(body.orders[0].order_id).toBe('ord-1')
  })

  it('returns 500 on unexpected error', async () => {
    mockGetToken.mockResolvedValue('jwt')
    mockWpFetch.mockRejectedValue(new Error('crash'))
    const res = await getOrders(makeGet('/api/gems/orders'))
    expect(res.status).toBe(500)
  })
})

// ── GET /api/gems/orders/[order_id] ──────────────────────────────────────────

describe('GET /api/gems/orders/[order_id]', () => {
  it('returns 401 when unauthenticated', async () => {
    mockGetToken.mockResolvedValue(null)
    const res = await getOrder(makeGet('/api/gems/orders/ord-1'), orderParams('ord-1'))
    expect(res.status).toBe(401)
  })

  it('returns order detail', async () => {
    mockGetToken.mockResolvedValue('jwt')
    mockWpFetch.mockResolvedValue(ORDER_DETAIL)
    const res = await getOrder(makeGet('/api/gems/orders/ord-1'), orderParams('ord-1'))
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.order_id).toBe('ord-1')
    expect(body.gems).toBe(10)
  })

  it('calls WP with order_id in path', async () => {
    mockGetToken.mockResolvedValue('jwt')
    mockWpFetch.mockResolvedValue(ORDER_DETAIL)
    await getOrder(makeGet('/api/gems/orders/ord-99'), orderParams('ord-99'))
    const [path] = mockWpFetch.mock.calls[0]
    expect(path).toContain('/gems/orders/ord-99')
  })

  it('returns 404 when order not found', async () => {
    mockGetToken.mockResolvedValue('jwt')
    mockWpFetch.mockRejectedValue(new WPApiError('knowly_not_found', 'Order not found.', 404))
    const res = await getOrder(makeGet('/api/gems/orders/bad'), orderParams('bad'))
    expect(res.status).toBe(404)
  })
})

// ── GET /api/gems/orders/[order_id]/stripe-intent ────────────────────────────

describe('GET /api/gems/orders/[order_id]/stripe-intent', () => {
  it('returns 401 when unauthenticated', async () => {
    mockGetToken.mockResolvedValue(null)
    const res = await stripeIntent(makeGet('/api/gems/orders/ord-1/stripe-intent'), orderParams('ord-1'))
    expect(res.status).toBe(401)
  })

  it('returns Stripe client_secret', async () => {
    mockGetToken.mockResolvedValue('jwt')
    mockWpFetch.mockResolvedValue(STRIPE_INTENT)
    const res = await stripeIntent(makeGet('/api/gems/orders/ord-1/stripe-intent'), orderParams('ord-1'))
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.client_secret).toBe('pi_xxx_secret')
    expect(body.payment_intent_id).toBe('pi_xxx')
  })

  it('calls WP with order_id in path', async () => {
    mockGetToken.mockResolvedValue('jwt')
    mockWpFetch.mockResolvedValue(STRIPE_INTENT)
    await stripeIntent(makeGet('/api/gems/orders/ord-42/stripe-intent'), orderParams('ord-42'))
    const [path] = mockWpFetch.mock.calls[0]
    expect(path).toContain('/gems/orders/ord-42/stripe-intent')
  })

  it('returns 402 when payment failed', async () => {
    mockGetToken.mockResolvedValue('jwt')
    mockWpFetch.mockRejectedValue(new WPApiError('payment_failed', 'Payment failed.', 402))
    const res = await stripeIntent(makeGet('/api/gems/orders/ord-1/stripe-intent'), orderParams('ord-1'))
    expect(res.status).toBe(402)
  })

  it('returns 500 on unexpected error', async () => {
    mockGetToken.mockResolvedValue('jwt')
    mockWpFetch.mockRejectedValue(new Error('Stripe unreachable'))
    const res = await stripeIntent(makeGet('/api/gems/orders/ord-1/stripe-intent'), orderParams('ord-1'))
    expect(res.status).toBe(500)
  })
})
