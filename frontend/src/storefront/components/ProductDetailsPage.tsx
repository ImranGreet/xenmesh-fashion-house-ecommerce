import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import type { Product, OrderConfirmation } from '../types'
import { API_URL, formatPrice, imageFor, imageUrl } from '../utils'
import { CashOnDeliveryCheckout } from './CashOnDeliveryCheckout'

export function ProductDetailsPage() {
  const { productId } = useParams()
  const [result, setResult] = useState<{ id: string | undefined; product?: Product; error?: string } | null>(null)
  const [quantity, setQuantity] = useState(1)
  const [checkout, setCheckout] = useState(false)
  const [confirmation, setConfirmation] = useState<OrderConfirmation | null>(null)

  useEffect(() => {
    let mounted = true
    fetch(`${API_URL}/catalog/products/${productId}`)
      .then(async (response) => {
        if (!response.ok) {
          if (response.status === 404) throw new Error('We could not find that product.')
          throw new Error(`Could not load product details (${response.status}).`)
        }
        return await response.json() as Product
      })
      .then((item) => {
        if (mounted) {
          setResult({ id: productId, product: item })
          document.title = `${item.name} — Xenmesh Fashion House`
        }
      })
      .catch((requestError: unknown) => {
        if (mounted) setResult({
          id: productId,
          error: requestError instanceof Error ? requestError.message : 'Could not load product details.',
        })
      })
    return () => { mounted = false }
  }, [productId])

  const currentResult = result?.id === productId ? result : null
  if (!currentResult) return <main className="product-detail-state"><span className="store-eyebrow">THE XENMESH EDIT</span><h1>Opening this piece…</h1></main>
  if (currentResult.error || !currentResult.product) return <main className="product-detail-state"><span className="store-eyebrow">A LITTLE DETOUR</span><h1>{currentResult.error || 'Product not found.'}</h1><Link className="hero-cta" to="/">Back to the collection <span aria-hidden="true">↗</span></Link></main>
  const product = currentResult.product

  const completeOrder = (order: OrderConfirmation) => {
    setConfirmation(order)
    setCheckout(false)
  }

  return (
    <main className="product-detail-page">
      <div className="product-detail-breadcrumb"><Link to="/">Home</Link><span>/</span><Link to={`/?category=${encodeURIComponent(product.category)}`}>{product.category}</Link><span>/</span><strong>{product.name}</strong></div>
      <div className="product-detail-layout">
        <div className="product-detail-image"><img src={imageUrl(imageFor(product, product.id), 1200)} alt={product.name} />{product.discountPercent && <span className="product-discount">-{product.discountPercent}%</span>}</div>
        <section className="product-detail-copy">
          <span className="store-eyebrow">{product.category.toUpperCase()} · XENMESH EDIT</span>
          <h1>{product.name}</h1>
          <div className="product-detail-price">{product.salePrice !== undefined && <del>{formatPrice(product.price)}</del>}<strong>{formatPrice(product.salePrice ?? product.price)}</strong>{product.discountPercent && <span>{product.discountPercent}% off</span>}</div>
          <p className="product-detail-stock">{product.stock > 0 ? `${product.stock} available` : 'Currently out of stock'}</p>
          <p className="product-detail-description">{product.description || 'A considered piece for your everyday. Thoughtful details, comfortable wear, and made to feel like you.'}</p>
          {product.promotion && <p className="product-promo-note">{product.promotion}</p>}
          {!confirmation && !checkout && product.stock > 0 && (
            <>
              <div className="detail-quantity"><span>Quantity</span><button aria-label="Decrease quantity" disabled={quantity <= 1} onClick={() => setQuantity((value) => Math.max(1, value - 1))}>−</button><strong>{quantity}</strong><button aria-label="Increase quantity" disabled={quantity >= product.stock} onClick={() => setQuantity((value) => Math.min(product.stock, value + 1))}>+</button></div>
              <button className="product-order-button" onClick={() => setCheckout(true)}>Order now · Cash on delivery</button>
            </>
          )}
          {checkout && <CashOnDeliveryCheckout items={[{ productId: product.id, quantity }]} total={(product.salePrice ?? product.price) * quantity} onComplete={completeOrder} onBack={() => setCheckout(false)} />}
          {confirmation && <div className="product-order-confirmation" role="status"><strong>Order placed — {confirmation.number}</strong><span>Pay {formatPrice(confirmation.total)} in cash when it arrives.</span><Link to="/">Continue browsing</Link></div>}
          <div className="detail-cod-note"><strong>Simple and secure</strong><span>Pay only when your order is delivered. We’ll call to confirm the details.</span></div>
        </section>
      </div>
      <div className="detail-back-link"><Link to="/">← Continue browsing</Link></div>
    </main>
  )
}
