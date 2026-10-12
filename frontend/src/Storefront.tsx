import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router'
import './storefront.css'
import { CashOnDeliveryCheckout } from './storefront/components/CashOnDeliveryCheckout'
import { ProductCard } from './storefront/components/ProductCard'
import type { CartItem, Category, OrderConfirmation, Product } from './storefront/types'
import { API_URL, formatPrice, imageFor, imageUrl } from './storefront/utils'
import { http } from './api/http'
import type { StoreSettings } from './admin/StoreSettingsForm'

const editorialImages = ['photo-1618354691373-d851c5c3a990', 'photo-1598033129183-c4f50c736f10', 'photo-1521572163474-6864f9cf17ab', 'photo-1618354691229-88d47f285158', 'photo-1591047139829-d91aecb6caea', 'photo-1627225924765-552d49cf47ad']

const heroImage = 'photo-1515886657613-9f3515b0c78f'
const fallbackSettings: StoreSettings = {
  storeName: 'Xenmesh Fashion House',
  contactEmail: 'xen@gmail.com',
  phone: '01912444216',
  location: 'Dhaka, Bangladesh',
}

function readCart(): CartItem[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem('xenmesh-cart') ?? '[]')
    if (!Array.isArray(value)) return []
    return value.filter((item): item is CartItem =>
      Boolean(item) &&
      typeof item === 'object' &&
      'product' in item &&
      typeof item.product === 'object' &&
      item.product !== null &&
      'id' in item.product &&
      typeof item.product.id === 'number' &&
      typeof item.quantity === 'number' &&
      Number.isInteger(item.quantity) &&
      item.quantity > 0,
    )
  } catch {
    return []
  }
}

function Icon({ name, size = 19 }: { name: string; size?: number }) {
  const paths: Record<string, ReactNode> = {
    search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></>,
    bag: <><path d="M5 8h14l1 13H4L5 8Z" /><path d="M9 8a3 3 0 0 1 6 0" /></>,
    arrow: <><path d="M7 17 17 7M7 7h10v10" /></>,
    plus: <><path d="M12 5v14M5 12h14" /></>,
    minus: <path d="M5 12h14" />,
    close: <><path d="m18 6-12 12M6 6l12 12" /></>,
    menu: <><path d="M4 6h16M4 12h16M4 18h16" /></>,
  }
  return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{paths[name] ?? paths.arrow}</svg>
}

function Storefront() {
  const [searchParams] = useSearchParams()
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [storeSettings, setStoreSettings] = useState<StoreSettings>(fallbackSettings)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedCategory, setSelectedCategory] = useState(() => searchParams.get('category') ?? 'All')
  const [search, setSearch] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const [cart, setCart] = useState<CartItem[]>(readCart)
  const [cartOpen, setCartOpen] = useState(false)
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [orderConfirmation, setOrderConfirmation] = useState<OrderConfirmation | null>(null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [savedProductIds, setSavedProductIds] = useState<number[]>([])
  const [savedOnly, setSavedOnly] = useState(false)
  const [addedProduct, setAddedProduct] = useState<number | null>(null)

  useEffect(() => {
    localStorage.setItem('xenmesh-cart', JSON.stringify(cart))
  }, [cart])

  useEffect(() => {
    document.title = `${storeSettings.storeName} — A little more you`
  }, [storeSettings.storeName])

  useEffect(() => {
    let mounted = true
    Promise.all([
      fetch(`${API_URL}/catalog/products`).then(async (response) => {
        if (!response.ok) throw new Error(`Could not load products (${response.status}).`)
        return (await response.json()) as Product[]
      }),
      fetch(`${API_URL}/catalog/categories`).then(async (response) => {
        if (!response.ok) throw new Error(`Could not load categories (${response.status}).`)
        return (await response.json()) as Category[]
      }),
    ])
      .then(([productList, categoryList]) => {
        if (!mounted) return
        setProducts(productList)
        setCategories(categoryList)
      })
      .catch((requestError: unknown) => {
        if (mounted) setError(requestError instanceof Error ? requestError.message : 'Could not connect to the store.')
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })
    return () => { mounted = false }
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    http.get<StoreSettings>('/store/settings', { signal: controller.signal })
      .then(({ data }) => setStoreSettings(data))
      .catch((requestError: unknown) => {
        if (!controller.signal.aborted) {
          console.error('Could not load public store settings.', requestError)
        }
      })
    return () => controller.abort()
  }, [])

  const visibleProducts = useMemo(() => {
    const query = search.trim().toLowerCase()
    return products.filter((product) => {
      const categoryMatches = selectedCategory === 'All' || product.category === selectedCategory
      const searchMatches = !query || `${product.name} ${product.category} ${product.description ?? ''}`.toLowerCase().includes(query)
      const savedMatches = !savedOnly || savedProductIds.includes(product.id)
      return categoryMatches && searchMatches && savedMatches
    })
  }, [products, savedOnly, savedProductIds, search, selectedCategory])

  const featuredProducts = products.filter((product) => product.discountPercent)
  const trendingProducts = products.slice(0, 6)
  const cartCount = cart.reduce((total, item) => total + item.quantity, 0)
  const cartTotal = cart.reduce((total, item) => total + (item.product.salePrice ?? item.product.price) * item.quantity, 0)

  function addToCart(product: Product) {
    setCart((current) => {
      const found = current.find((item) => item.product.id === product.id)
      if (found) {
        return current.map((item) => item.product.id === product.id
          ? { ...item, quantity: Math.min(item.quantity + 1, product.stock) }
          : item)
      }
      return [...current, { product, quantity: 1 }]
    })
    setAddedProduct(product.id)
    window.setTimeout(() => setAddedProduct((current) => current === product.id ? null : current), 1600)
  }

  function adjustCart(productId: number, delta: number) {
    setCart((current) => current
      .map((item) => item.product.id === productId
        ? { ...item, quantity: item.quantity + delta }
        : item)
      .filter((item) => item.quantity > 0))
  }

  function browseCollection(category = 'All') {
    setSelectedCategory(category)
    setSavedOnly(false)
    setMobileMenuOpen(false)
    document.getElementById('collection')?.scrollIntoView({ behavior: 'smooth' })
  }

  function toggleSaved(productId: number) {
    setSavedProductIds((current) => current.includes(productId)
      ? current.filter((id) => id !== productId)
      : [...current, productId])
  }

  function browseSaved() {
    setSelectedCategory('All')
    setSavedOnly(true)
    document.getElementById('collection')?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <div className="storefront">
      <div className="store-announcement">
        <span>THOUGHTFULLY MADE. ALWAYS YOURS.</span>
        <a href={`tel:${storeSettings.phone}`}>A little help? <strong>{storeSettings.phone}</strong></a>
      </div>
      <header className="store-header">
        <button className="store-icon mobile-menu-trigger" aria-label="Open menu" onClick={() => setMobileMenuOpen(true)}><Icon name="menu" /></button>
        <Link className="store-brand" to="/" aria-label="Xenmesh Fashion House home">
          <span className="store-brand-mark">X</span>
          <span><strong>{storeSettings.storeName.toUpperCase()}</strong><small>FASHION HOUSE</small></span>
        </Link>
        <nav className={`store-nav ${mobileMenuOpen ? 'store-nav-open' : ''}`} aria-label="Store navigation">
          <button className="mobile-nav-close store-icon" aria-label="Close menu" onClick={() => setMobileMenuOpen(false)}><Icon name="close" /></button>
          <button onClick={() => browseCollection()}>New arrivals</button>
          <button onClick={() => browseCollection('Panjabi')}>Panjabi</button>
          <button onClick={() => browseCollection('T-shirts')}>Everyday tees</button>
          <button onClick={() => browseCollection('Accessories')}>Accessories</button>
          <button onClick={() => browseCollection('All')}>The collection</button>
        </nav>
        {mobileMenuOpen && <button className="store-menu-backdrop" aria-label="Close menu" onClick={() => setMobileMenuOpen(false)} />}
        <div className="store-header-actions">
          <div className={`store-search ${searchOpen ? 'store-search-open' : ''}`}>
            {searchOpen && <input autoFocus aria-label="Search products" placeholder="Search the collection" value={search} onChange={(event) => { setSearch(event.target.value); browseCollection() }} onKeyDown={(event) => event.key === 'Escape' && setSearchOpen(false)} />}
            <button className="store-icon" aria-label={searchOpen ? 'Close search' : 'Search'} onClick={() => { setSearchOpen((open) => !open); if (searchOpen) setSearch('') }}><Icon name={searchOpen ? 'close' : 'search'} /></button>
          </div>
          <button className="store-bag-button" aria-label={`Shopping bag, ${cartCount} items`} onClick={() => setCartOpen(true)}><Icon name="bag" size={20} /><span>Bag</span><i>{cartCount}</i></button>
          <Link className="store-admin-link" to="/admin">Account</Link>
        </div>
      </header>

      <main>
        <section className="store-hero">
          <div className="hero-image" style={{ backgroundImage: `url("${imageUrl(heroImage, 1800)}")` }} />
          <div className="hero-shade" />
          <div className="hero-copy">
            <span className="store-eyebrow"><i /> THE NEW SEASON, IN YOUR OWN WAY</span>
            <h1>Get dressed<br />for <em>yourself.</em></h1>
            <p>Easy pieces. Thoughtful details.<br />A little more you, every day.</p>
            <button className="hero-cta" onClick={() => browseCollection()}>Discover the collection <Icon name="arrow" size={16} /></button>
          </div>
          <div className="hero-caption"><span>01 / 03</span><i /><span>THE EVERYDAY EDIT</span></div>
          <span className="hero-side-note">XENMESH · DHAKA</span>
          <button className="hero-scroll" onClick={() => browseCollection()}>SCROLL TO EXPLORE <span>↓</span></button>
        </section>

        <section className="store-intro">
          <span className="store-eyebrow">A WARDROBE THAT FEELS LIKE YOU</span>
          <p>Not just something to wear.<br /><em>Something to feel good in.</em></p>
          <span className="intro-flower" aria-hidden="true">✳</span>
        </section>

        <section className="category-section" aria-labelledby="category-title">
          <div className="store-section-heading">
            <div><span className="store-eyebrow">FIND YOUR FEEL</span><h2 id="category-title">Shop by <em>category</em></h2></div>
            <button className="store-text-link" onClick={() => browseCollection()}>View all <Icon name="arrow" size={15} /></button>
          </div>
          <div className="category-tiles">
            {categories.slice(0, 5).map((category, index) => (
              <button className={`category-tile category-tile-${index + 1}`} key={category.id} onClick={() => browseCollection(category.name)}>
                <span className="category-tile-image" style={{ backgroundImage: `url("${imageUrl(editorialImages[index % editorialImages.length], 650)}")` }} />
                <span className="category-tile-wash" />
                <span className="category-tile-copy"><small>EXPLORE</small><strong>{category.name}</strong></span>
                <span className="category-tile-arrow"><Icon name="arrow" size={16} /></span>
              </button>
            ))}
            {!categories.length && !loading && <p className="store-inline-note">New categories are coming soon.</p>}
          </div>
        </section>

        {featuredProducts.length > 0 && (
          <section className="featured-offer">
            <div className="offer-ornament" aria-hidden="true">✳</div>
            <div><span className="store-eyebrow">A LITTLE SOMETHING EXTRA</span><h2>Good things.<br /><em>Better prices.</em></h2><p>A few favorites, with a little thank-you from us.</p><button className="offer-link" onClick={() => browseCollection()}>Shop the edit <Icon name="arrow" size={15} /></button></div>
            <div className="offer-featured-image" style={{ backgroundImage: `url("${imageUrl(imageFor(featuredProducts[0], 0), 900)}")` }}>
              <span>{featuredProducts[0].discountPercent}% OFF</span>
            </div>
          </section>
        )}

        {trendingProducts.length > 0 && (
          <section className="trending-section" aria-labelledby="trending-title">
            <div className="store-section-heading">
              <div><span className="store-eyebrow">A FEW GOOD FINDS</span><h2 id="trending-title">Trending <em>now.</em></h2></div>
              <button className="store-text-link" onClick={() => browseCollection()}>Explore all <Icon name="arrow" size={15} /></button>
            </div>
            <div className="trending-rail">
              {trendingProducts.map((product, index) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  index={index}
                  added={addedProduct === product.id}
                  saved={savedProductIds.includes(product.id)}
                  onAdd={addToCart}
                  onToggleSaved={toggleSaved}
                />
              ))}
            </div>
          </section>
        )}

        <section className="collection-section" id="collection" aria-labelledby="collection-title">
          <div className="store-section-heading collection-heading">
            <div><span className="store-eyebrow">{savedOnly ? 'YOUR SHORTLIST' : 'THE XENMESH EDIT'}</span><h2 id="collection-title">{savedOnly ? <>Saved <em>pieces.</em></> : <>Pieces for <em>your days.</em></>}</h2></div>
            <span className="collection-count">{visibleProducts.length.toString().padStart(2, '0')} PIECES</span>
          </div>
          <div className="collection-controls">
            <div className="category-filters" aria-label="Filter by category">
              {['All', ...categories.map((category) => category.name)].map((category) => <button key={category} className={selectedCategory === category ? 'filter-active' : ''} onClick={() => setSelectedCategory(category)}>{category}</button>)}
            </div>
            <span className="sort-note">A GOOD PLACE TO START <i>✳</i></span>
          </div>
          {error && <div className="store-error" role="alert"><span>{error}</span><button onClick={() => window.location.reload()}>Try again</button></div>}
          {loading ? <div className="store-loading"><span /><span /><span /><span /></div> : visibleProducts.length ? (
            <div className="store-product-grid">
              {visibleProducts.map((product, index) => <ProductCard key={product.id} product={product} index={index} added={addedProduct === product.id} saved={savedProductIds.includes(product.id)} onAdd={addToCart} onToggleSaved={toggleSaved} />)}
            </div>
          ) : !error ? <div className="store-empty"><span className="store-eyebrow">A LITTLE QUIET AROUND HERE</span><h3>{savedOnly ? 'Nothing saved just yet.' : products.length ? 'No pieces in this edit just yet.' : 'The collection is on its way.'}</h3><p>{savedOnly ? 'Tap the heart on any piece to keep it close.' : products.length ? 'Try another category or browse everything.' : 'We are getting the rails ready. Check back soon.'}</p>{products.length > 0 && <button className="store-text-link" onClick={() => { setSelectedCategory('All'); setSearch(''); setSavedOnly(false) }}>View the full collection <Icon name="arrow" size={15} /></button>}</div> : null}
        </section>

        <section className="store-story">
          <div className="story-image" style={{ backgroundImage: `url("${imageUrl('photo-1483985988355-763728e1935b', 1000)}")` }} />
          <div className="story-copy"><span className="store-eyebrow">MADE FOR THE MOMENTS IN BETWEEN</span><h2>Wear what<br />feels <em>like home.</em></h2><p>For the long plans, the slow mornings, and everything that happens in between. Find your everyday, your way.</p><button className="story-link" onClick={() => browseCollection()}>Find your everyday <Icon name="arrow" size={15} /></button><span className="story-mark">X</span></div>
        </section>

        <section className="store-promises">
          <article><span>01</span><div><strong>Thoughtful by design</strong><small>Everyday favorites, picked with care.</small></div></article>
          <article><span>02</span><div><strong>Here in Dhaka</strong><small>A local house, always happy to help.</small></div></article>
          <article><span>03</span><div><strong>Made to be yours</strong><small>Pieces for wherever the day takes you.</small></div></article>
        </section>
      </main>

      <footer className="store-footer">
        <div className="footer-main">
          <div className="footer-brand-block"><Link className="store-brand" to="/" aria-label={storeSettings.storeName}><span className="store-brand-mark">X</span><span><strong>{storeSettings.storeName.toUpperCase()}</strong><small>FASHION HOUSE</small></span></Link><p>Thoughtfully made.<br />Always yours.</p></div>
          <div className="footer-column"><span className="store-eyebrow">EXPLORE</span><button onClick={() => browseCollection()}>The collection</button><button onClick={() => browseCollection('Panjabi')}>Panjabi</button><button onClick={() => browseCollection('Accessories')}>Accessories</button></div>
          <div className="footer-column"><span className="store-eyebrow">THE HOUSE</span><a href={`mailto:${storeSettings.contactEmail}`}>{storeSettings.contactEmail}</a><a href={`tel:${storeSettings.phone}`}>{storeSettings.phone}</a><span>{storeSettings.location}</span></div>
          <div className="footer-note"><span className="store-eyebrow">A NOTE FROM THE HOUSE</span><p>Good style should feel like you. Thanks for being here.</p><Link to="/admin">Store administration <Icon name="arrow" size={13} /></Link></div>
        </div>
        <div className="footer-bottom"><span>© {new Date().getFullYear()} {storeSettings.storeName.toUpperCase()}</span><span>MADE WITH CARE, IN {storeSettings.location.toUpperCase()} <i>✳</i></span></div>
      </footer>

      <a className="store-whatsapp" href={`https://wa.me/${storeSettings.phone.replace(/\D/g, '').replace(/^0/, '880')}`} target="_blank" rel="noreferrer" aria-label={`Contact ${storeSettings.storeName} on WhatsApp`}>WA</a>
      <nav className="store-mobile-bar" aria-label="Quick navigation">
        <button className="mobile-bar-active" onClick={() => { setSavedOnly(false); window.scrollTo({ top: 0, behavior: 'smooth' }) }}><span>⌂</span>Home</button>
        <button onClick={() => browseCollection()}><span>✳</span>New</button>
        <button onClick={() => setCartOpen(true)}><span className="mobile-bag-icon"><Icon name="bag" size={17} />{cartCount > 0 && <i>{cartCount}</i>}</span>Bag</button>
        <button onClick={browseSaved}><span>♡</span>Saved</button>
        <Link to="/admin"><span>◯</span>Account</Link>
      </nav>

      {cartOpen && (
        <div className="cart-layer">
          <button className="cart-backdrop" aria-label="Close shopping bag" onClick={() => setCartOpen(false)} />
          <aside className="cart-drawer" aria-label="Shopping bag">
            <div className="cart-heading">
              <div><span className="store-eyebrow">{orderConfirmation ? 'ORDER RECEIVED' : checkoutOpen ? 'DELIVERY DETAILS' : 'YOUR PICKS'}</span><h2>{orderConfirmation ? 'Thank you.' : checkoutOpen ? 'Cash on delivery' : <>Your bag <em>({cartCount})</em></>}</h2></div>
              <button className="store-icon" aria-label="Close shopping bag" onClick={() => setCartOpen(false)}><Icon name="close" /></button>
            </div>
            {orderConfirmation ? (
              <div className="checkout-confirmation" role="status">
                <span className="checkout-check">✓</span>
                <h3>Your order is on its way to the house.</h3>
                <p>Order <strong>{orderConfirmation.number}</strong> has been placed. Pay <strong>{formatPrice(orderConfirmation.total)}</strong> in cash when it arrives.</p>
                <p>We’ll contact you at the phone number you provided to confirm delivery.</p>
                <button className="cart-checkout" onClick={() => { setCartOpen(false); setOrderConfirmation(null) }}>Continue browsing <Icon name="arrow" size={16} /></button>
              </div>
            ) : checkoutOpen ? (
              <CashOnDeliveryCheckout
                items={cart.map(({ product, quantity }) => ({ productId: product.id, quantity }))}
                total={cartTotal}
                onComplete={(order) => {
                  setOrderConfirmation(order)
                  setCart([])
                  setCheckoutOpen(false)
                }}
                onBack={() => setCheckoutOpen(false)}
              />
            ) : cart.length ? (
              <>
                <div className="cart-items">{cart.map(({ product, quantity }) => (
                  <article className="cart-item" key={product.id}>
                    <img src={imageUrl(imageFor(product, product.id), 180)} alt="" />
                    <div className="cart-item-copy">
                      <strong>{product.name}</strong><small>{product.category}</small>
                      <span>{formatPrice(product.salePrice ?? product.price)}</span>
                      <div className="quantity-control">
                        <button aria-label={`Remove one ${product.name}`} onClick={() => adjustCart(product.id, -1)}><Icon name="minus" size={13} /></button>
                        <span>{quantity}</span>
                        <button aria-label={`Add one ${product.name}`} disabled={quantity >= product.stock} onClick={() => adjustCart(product.id, 1)}><Icon name="plus" size={13} /></button>
                      </div>
                    </div>
                    <button className="cart-remove" aria-label={`Remove ${product.name}`} onClick={() => setCart((current) => current.filter((item) => item.product.id !== product.id))}><Icon name="close" size={16} /></button>
                  </article>
                ))}</div>
                <div className="cart-bottom">
                  <div className="cart-subtotal"><span>Subtotal</span><strong>{formatPrice(cartTotal)}</strong></div>
                  <small>Payment by cash on delivery. No online payment needed.</small>
                  <button className="cart-checkout" onClick={() => setCheckoutOpen(true)}>Continue to delivery details <Icon name="arrow" size={16} /></button>
                </div>
              </>
            ) : (
              <div className="cart-empty"><span className="cart-empty-mark"><Icon name="bag" size={24} /></span><h3>A little space for something good.</h3><p>Your bag is waiting for a favorite.</p><button className="hero-cta" onClick={() => { setCartOpen(false); browseCollection() }}>Explore the collection <Icon name="arrow" size={15} /></button></div>
            )}
          </aside>
        </div>
      )}
    </div>
  )
}

export default Storefront
