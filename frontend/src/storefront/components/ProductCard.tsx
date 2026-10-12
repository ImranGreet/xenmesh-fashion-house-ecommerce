import { Link } from 'react-router'
import type { Product } from '../types'
import { formatPrice, imageFor, imageUrl } from '../utils'

export function ProductCard({
  product,
  index,
  added,
  saved,
  onAdd,
  onToggleSaved,
}: {
  product: Product
  index: number
  added: boolean
  saved: boolean
  onAdd: (product: Product) => void
  onToggleSaved: (productId: number) => void
}) {
  return (
    <article className="store-product-card">
      <div className={`product-image-wrap product-image-${index % 4}`}>
        <Link className="product-detail-link" to={`/products/${product.id}`} aria-label={`View ${product.name} details`}>
          <img src={imageUrl(imageFor(product, index), 720)} alt={product.name} loading="lazy" />
        </Link>
        {product.discountPercent && <span className="product-discount">-{product.discountPercent}%</span>}
        <button className={`product-favorite ${saved ? 'is-favorite' : ''}`} aria-label={`${saved ? 'Unsave' : 'Save'} ${product.name}`} aria-pressed={saved} onClick={() => onToggleSaved(product.id)}>
          <svg aria-hidden="true" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z" /></svg>
        </button>
        <button className={`quick-add ${added ? 'quick-added' : ''}`} onClick={() => onAdd(product)} disabled={product.stock < 1}>
          <span>{added ? 'Added to bag' : product.stock < 1 ? 'Sold out' : 'Add to bag'}</span>
        </button>
      </div>
      <div className="product-card-meta"><span>{product.category}</span><span>{product.stock < 1 ? 'SOLD OUT' : product.stock < 5 ? 'FEW LEFT' : 'READY TO WEAR'}</span></div>
      <div className="product-card-title"><h3><Link to={`/products/${product.id}`}>{product.name}</Link></h3><div>{product.salePrice !== undefined && <del>{formatPrice(product.price)}</del>}<strong>{formatPrice(product.salePrice ?? product.price)}</strong></div></div>
      {product.promotion && <small className="product-promo-note">{product.promotion}</small>}
    </article>
  )
}
