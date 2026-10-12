import { useState } from 'react'
import type { FormEvent } from 'react'
import type { OrderConfirmation } from '../types'
import { API_URL, formatPrice } from '../utils'

export type OrderLine = {
  productId: number
  quantity: number
}

export function CashOnDeliveryCheckout({
  items,
  total,
  onComplete,
  onBack,
}: {
  items: OrderLine[]
  total: number
  onComplete: (order: OrderConfirmation) => void
  onBack?: () => void
}) {
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    setError('')
    const form = new FormData(event.currentTarget)
    try {
      const response = await fetch(`${API_URL}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: String(form.get('customerName')),
          phone: String(form.get('phone')),
          email: String(form.get('email')) || undefined,
          address: String(form.get('address')),
          city: String(form.get('city')) || undefined,
          notes: String(form.get('notes')) || undefined,
          items,
        }),
      })
      const result = await response.json() as { number?: string; total?: number; message?: string | string[] }
      if (!response.ok) {
        const message = Array.isArray(result.message) ? result.message.join(', ') : result.message
        throw new Error(message || `Unable to place order (${response.status}).`)
      }
      if (!result.number || typeof result.total !== 'number') {
        throw new Error('The order was submitted, but its confirmation could not be read. Please contact the store before retrying.')
      }
      onComplete({ number: result.number, total: result.total })
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to place your order. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form className="checkout-form" onSubmit={submit}>
      <p className="cod-note"><strong>Cash on delivery</strong><span>Pay in cash when your order arrives. No online payment is required.</span></p>
      <label>Full name<input name="customerName" autoComplete="name" maxLength={160} required /></label>
      <label>Phone number<input name="phone" type="tel" autoComplete="tel" maxLength={32} placeholder="e.g. 01XXXXXXXXX" required /></label>
      <label>Email <span>(optional)</span><input name="email" type="email" autoComplete="email" maxLength={254} /></label>
      <label>Delivery address<textarea name="address" autoComplete="street-address" maxLength={500} rows={3} required /></label>
      <label>City or area <span>(optional)</span><input name="city" autoComplete="address-level2" maxLength={100} /></label>
      <label>Order notes <span>(optional)</span><textarea name="notes" maxLength={1000} rows={2} placeholder="Size, color, or delivery instructions" /></label>
      {error && <p className="checkout-error" role="alert">{error}</p>}
      <div className="cart-bottom">
        <div className="cart-subtotal"><span>Order total</span><strong>{formatPrice(total)}</strong></div>
        <small>Delivery fee, if applicable, will be confirmed by the store before dispatch.</small>
        <button className="cart-checkout" disabled={submitting}>{submitting ? 'Placing order…' : 'Place order · Cash on delivery'} <span aria-hidden="true">↗</span></button>
        {onBack && <button className="checkout-back" type="button" onClick={onBack}>Back to bag</button>}
      </div>
    </form>
  )
}
