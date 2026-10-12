import { useEffect, useMemo, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import './App.css'

const API_URL = (import.meta.env.VITE_API_URL ?? 'http://localhost:3001').replace(/\/$/, '')

type AdminUser = {
  id: string
  email: string
  firstName: string | null
  lastName: string | null
}

type Product = {
  id: number
  name: string
  category: string
  categoryId: number
  sku: string
  description: string | null
  price: number
  stock: number
  updatedAt: string
}

type Category = {
  id: number
  name: string
  slug: string
  active: boolean
  _count?: { products: number }
}

type CampaignType = 'SELECTED_PRODUCTS' | 'CATEGORY' | 'MONTHLY' | 'EVENT'
type TargetType = 'PRODUCTS' | 'CATEGORY' | 'STOREWIDE'

type Promotion = {
  id: number
  title: string
  campaignType: CampaignType
  targetType: TargetType
  targetValue: string | null
  targetProductIds: number[]
  targetProductNames: string[]
  discountPercent: number
  startsAt: string
  endsAt: string
  active: boolean
  currentlyLive: boolean
  status: 'LIVE' | 'SCHEDULED' | 'ENDED' | 'PAUSED'
}

type Section = 'Overview' | 'Products' | 'Categories' | 'Promotions' | 'Settings'

class ApiError extends Error {
  readonly status: number

  constructor(
    message: string,
    status: number,
  ) {
    super(message)
    this.status = status
  }
}

async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers,
    },
  })

  if (!response.ok) {
    let message = `Request failed (${response.status})`
    try {
      const body = (await response.json()) as { message?: string | string[] }
      if (typeof body.message === 'string') message = body.message
      else if (Array.isArray(body.message)) message = body.message.join(', ')
    } catch {
      // Keep the HTTP status message when an error response has no JSON body.
    }
    throw new ApiError(message, response.status)
  }

  if (response.status === 204) return undefined as T
  return (await response.json()) as T
}

function Icon({ name, size = 19 }: { name: string; size?: number }) {
  const paths: Record<string, ReactNode> = {
    grid: <><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></>,
    box: <><path d="m12 3 9 5-9 5-9-5 9-5Z" /><path d="m3 8 9 5 9-5" /><path d="M3 8v9l9 5 9-5V8M12 13v9" /></>,
    tag: <><path d="M20.6 13.4 13 21l-10-10V3h8l9.6 9.6a.6.6 0 0 1 0 .8Z" /><circle cx="7.5" cy="7.5" r="1.5" /></>,
    settings: <><circle cx="12" cy="12" r="3" /><path d="m19.4 15 .1.1 1.4 1.1-1.4 2.4-1.7-.7a8 8 0 0 1-1.5.9l-.3 1.8h-2.8l-.3-1.8a8 8 0 0 1-1.5-.9l-1.7.7-1.4-2.4 1.4-1.1a7 7 0 0 1 0-1.8l-1.4-1.1 1.4-2.4 1.7.7a8 8 0 0 1 1.5-.9l.3-1.8h2.8l.3 1.8a8 8 0 0 1 1.5.9l1.7-.7 1.4 2.4-1.4 1.1a7 7 0 0 1-.1 1.7Z" transform="translate(-1 -1)" /></>,
    search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></>,
    bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" /><path d="M10 21h4" /></>,
    plus: <><path d="M12 5v14M5 12h14" /></>,
    arrow: <><path d="M7 17 17 7M7 7h10v10" /></>,
    chevron: <path d="m9 18 6-6-6-6" />,
    logout: <><path d="M10 17l5-5-5-5M15 12H3" /><path d="M12 3h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-6" /></>,
    close: <><path d="m18 6-12 12M6 6l12 12" /></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 11h18" /></>,
    bag: <><path d="M5 8h14l1 13H4L5 8Z" /><path d="M9 8a3 3 0 0 1 6 0" /></>,
    layers: <><path d="m12 3 9 5-9 5-9-5 9-5Z" /><path d="m3 12 9 5 9-5M3 16l9 5 9-5" /></>,
    menu: <><path d="M4 6h16M4 12h16M4 18h16" /></>,
  }

  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      {paths[name] ?? paths.grid}
    </svg>
  )
}

function formatPrice(value: number) {
  return new Intl.NumberFormat('en-BD', {
    style: 'currency',
    currency: 'BDT',
    maximumFractionDigits: 0,
  }).format(value)
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value))
}

function localDateTime(value?: string) {
  const date = value ? new Date(value) : new Date()
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset())
  return date.toISOString().slice(0, 16)
}

function campaignLabel(value: CampaignType) {
  return {
    SELECTED_PRODUCTS: 'Selected products',
    CATEGORY: 'Category offer',
    MONTHLY: 'Monthly offer',
    EVENT: 'Seasonal event',
  }[value]
}

function SignIn({ onSignedIn }: { onSignedIn: (user: AdminUser) => void }) {
  const [email, setEmail] = useState('xen@gmail.com')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const result = await api<{ user: AdminUser }>('/auth/sign-in', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      })
      onSignedIn(result.user)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to sign in.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="login-shell">
      <section className="login-aside">
        <a className="brand brand-light" href="#" aria-label="Xenmesh Fashion home">
          <span className="brand-mark">X</span>
          <span><strong>XENMESH</strong><small>FASHION HOUSE</small></span>
        </a>
        <div className="login-editorial">
          <span className="eyebrow">THE ART OF EVERYDAY</span>
          <h1>Style, with<br /><em>intention.</em></h1>
          <p>A considered wardrobe. Thoughtful details. Welcome back to the house.</p>
        </div>
        <span className="login-aside-note">DHAKA · EST. 2024</span>
      </section>
      <section className="login-main">
        <div className="login-card">
          <a className="mobile-brand brand" href="#" aria-label="Xenmesh Fashion home">
            <span className="brand-mark">X</span>
            <span><strong>XENMESH</strong><small>FASHION HOUSE</small></span>
          </a>
          <span className="eyebrow">ADMINISTRATION</span>
          <h2>Welcome back</h2>
          <p className="login-copy">Sign in to manage your store, collections, and offers.</p>
          <form className="login-form" onSubmit={handleSubmit}>
            <label htmlFor="admin-email">Email address</label>
            <input id="admin-email" type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} required />
            <div className="label-row"><label htmlFor="admin-password">Password</label></div>
            <input id="admin-password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required />
            {error && <p className="form-error" role="alert">{error}</p>}
            <button className="button button-primary login-submit" type="submit" disabled={submitting}>
              {submitting ? 'Signing in…' : 'Sign in to dashboard'} <Icon name="arrow" size={17} />
            </button>
          </form>
          <p className="login-footer">Need access? Contact <a href="mailto:xen@gmail.com">xen@gmail.com</a></p>
        </div>
      </section>
    </main>
  )
}

function CategoryModal({
  category,
  onClose,
  onSaved,
}: {
  category: Category | null
  onClose: () => void
  onSaved: () => Promise<void>
}) {
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setSaving(true)
    const form = new FormData(event.currentTarget)
    try {
      await api(`/admin/categories${category ? `/${category.id}` : ''}`, {
        method: category ? 'PATCH' : 'POST',
        body: JSON.stringify({ name: String(form.get('name')).trim() }),
      })
      await onSaved()
      onClose()
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to save category.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="modal" role="dialog" aria-modal="true" aria-labelledby="category-modal-title">
        <div className="modal-heading"><div><span className="eyebrow">ORGANIZE THE COLLECTION</span><h2 id="category-modal-title">{category ? 'Rename category' : 'Add a category'}</h2></div><button className="icon-button" aria-label="Close" onClick={onClose}><Icon name="close" /></button></div>
        <form className="modal-form" onSubmit={submit}>
          <label>Category name<input name="name" defaultValue={category?.name} placeholder="e.g. Panjabi" maxLength={80} required autoFocus /></label>
          {error && <p className="form-error" role="alert">{error}</p>}
          <div className="modal-actions"><button className="button button-quiet" type="button" onClick={onClose}>Cancel</button><button className="button button-primary" disabled={saving}>{saving ? 'Saving…' : category ? 'Save category' : 'Add category'}</button></div>
        </form>
      </section>
    </div>
  )
}

function ProductModal({
  product,
  categories,
  onClose,
  onSaved,
}: {
  product: Product | null
  categories: Category[]
  onClose: () => void
  onSaved: () => Promise<void>
}) {
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setSaving(true)
    const form = new FormData(event.currentTarget)
    const payload = {
      name: String(form.get('name')).trim(),
      categoryId: Number(form.get('categoryId')),
      sku: String(form.get('sku')).trim(),
      description: String(form.get('description')).trim() || null,
      price: Number(form.get('price')),
      stock: Number(form.get('stock')),
    }
    try {
      await api(`/admin/products${product ? `/${product.id}` : ''}`, {
        method: product ? 'PATCH' : 'POST',
        body: JSON.stringify(payload),
      })
      await onSaved()
      onClose()
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to save product.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="modal" role="dialog" aria-modal="true" aria-labelledby="product-modal-title">
        <div className="modal-heading"><div><span className="eyebrow">{product ? 'EDIT COLLECTION' : 'NEW ARRIVAL'}</span><h2 id="product-modal-title">{product ? 'Edit product' : 'Add a product'}</h2></div><button className="icon-button" aria-label="Close" onClick={onClose}><Icon name="close" /></button></div>
        <form className="modal-form" onSubmit={submit}>
          <label>Product name<input name="name" defaultValue={product?.name} placeholder="e.g. Classic cotton panjabi" maxLength={160} required /></label>
          <div className="form-grid"><label>Category<select name="categoryId" defaultValue={product?.categoryId ?? ''} required><option value="" disabled>Choose a category</option>{categories.map((category) => <option value={category.id} key={category.id}>{category.name}</option>)}</select>{!categories.length && <span className="optional">Add a category before creating products.</span>}</label><label>SKU<input name="sku" defaultValue={product?.sku} placeholder="XFS-001" maxLength={64} required /></label></div>
          <label>Description <span className="optional">(optional)</span><textarea name="description" defaultValue={product?.description ?? ''} rows={3} placeholder="A few details about this piece…" maxLength={5000} /></label>
          <div className="form-grid"><label>Price (৳)<input name="price" type="number" min="0" step="0.01" defaultValue={product?.price ?? ''} placeholder="0.00" required /></label><label>Stock on hand<input name="stock" type="number" min="0" step="1" defaultValue={product?.stock ?? 0} required /></label></div>
          {error && <p className="form-error" role="alert">{error}</p>}
          <div className="modal-actions"><button className="button button-quiet" type="button" onClick={onClose}>Cancel</button><button className="button button-primary" disabled={saving || !categories.length}>{saving ? 'Saving…' : product ? 'Save changes' : 'Add product'}</button></div>
        </form>
      </section>
    </div>
  )
}

function PromotionModal({
  promotion,
  products,
  categories,
  onClose,
  onSaved,
}: {
  promotion: Promotion | null
  products: Product[]
  categories: Category[]
  onClose: () => void
  onSaved: () => Promise<void>
}) {
  const [targetType, setTargetType] = useState<TargetType>(promotion?.targetType ?? 'PRODUCTS')
  const [productIds, setProductIds] = useState<number[]>(promotion?.targetProductIds ?? [])
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [defaultEndDate] = useState(() =>
    localDateTime(new Date(Date.now() + 7 * 86400000).toISOString()),
  )

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setSaving(true)
    const form = new FormData(event.currentTarget)
    const campaignType = String(form.get('campaignType')) as CampaignType
    const payload = {
      title: String(form.get('title')).trim(),
      campaignType,
      targetType,
      targetValue: targetType === 'CATEGORY' ? String(form.get('targetValue')).trim() : null,
      targetProductIds: targetType === 'PRODUCTS' ? productIds : [],
      discountPercent: Number(form.get('discountPercent')),
      startsAt: new Date(String(form.get('startsAt'))).toISOString(),
      endsAt: new Date(String(form.get('endsAt'))).toISOString(),
      active: true,
    }
    try {
      await api(`/admin/promotions${promotion ? `/${promotion.id}` : ''}`, {
        method: promotion ? 'PATCH' : 'POST',
        body: JSON.stringify(payload),
      })
      await onSaved()
      onClose()
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to save offer.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="modal modal-wide" role="dialog" aria-modal="true" aria-labelledby="promotion-modal-title">
        <div className="modal-heading"><div><span className="eyebrow">A REASON TO CELEBRATE</span><h2 id="promotion-modal-title">{promotion ? 'Edit offer' : 'Create an offer'}</h2></div><button className="icon-button" aria-label="Close" onClick={onClose}><Icon name="close" /></button></div>
        <form className="modal-form" onSubmit={submit}>
          <label>Offer name<input name="title" defaultValue={promotion?.title} placeholder="Eid edit · Festive season" maxLength={160} required /></label>
          <div className="form-grid"><label>Offer type<select name="campaignType" defaultValue={promotion?.campaignType ?? 'EVENT'}><option value="EVENT">Seasonal event</option><option value="MONTHLY">Monthly offer</option><option value="CATEGORY">Category offer</option><option value="SELECTED_PRODUCTS">Selected products</option></select></label><label>Discount<input name="discountPercent" type="number" min="1" max="100" step="1" defaultValue={promotion?.discountPercent ?? 15} required /></label></div>
          <label>Apply offer to<select value={targetType} onChange={(event) => setTargetType(event.target.value as TargetType)}><option value="PRODUCTS">Selected products</option><option value="CATEGORY">A category</option><option value="STOREWIDE">Entire store</option></select></label>
          {targetType === 'PRODUCTS' && (
            <fieldset className="product-picker"><legend>Choose products <span className="optional">({productIds.length} selected)</span></legend>
              {products.length ? <div className="product-picker-list">{products.map((product) => <label key={product.id} className="product-picker-option"><input type="checkbox" checked={productIds.includes(product.id)} onChange={(event) => setProductIds((current) => event.target.checked ? [...current, product.id] : current.filter((id) => id !== product.id))} /><span>{product.name}<small>{product.category} · {formatPrice(product.price)}</small></span></label>)}</div> : <p className="empty-picker">Add products to your store before creating a selected-products offer.</p>}
            </fieldset>
          )}
          {targetType === 'CATEGORY' && <label>Category<select name="targetValue" defaultValue={promotion?.targetValue ?? ''} required><option value="" disabled>Choose a category</option>{categories.map((category) => <option value={category.name} key={category.id}>{category.name}</option>)}</select></label>}
          <div className="form-grid"><label>Starts<input name="startsAt" type="datetime-local" defaultValue={localDateTime(promotion?.startsAt)} required /></label><label>Ends<input name="endsAt" type="datetime-local" defaultValue={promotion ? localDateTime(promotion.endsAt) : defaultEndDate} required /></label></div>
          {error && <p className="form-error" role="alert">{error}</p>}
          <div className="modal-actions"><button className="button button-quiet" type="button" onClick={onClose}>Cancel</button><button className="button button-primary" disabled={saving || (targetType === 'PRODUCTS' && !productIds.length)}>{saving ? 'Saving…' : promotion ? 'Save offer' : 'Create offer'}</button></div>
        </form>
      </section>
    </div>
  )
}

function App() {
  const [user, setUser] = useState<AdminUser | null>(null)
  const [checkingSession, setCheckingSession] = useState(true)
  const [sessionError, setSessionError] = useState('')
  const [section, setSection] = useState<Section>('Overview')
  const [products, setProducts] = useState<Product[]>([])
  const [categoryRecords, setCategoryRecords] = useState<Category[]>([])
  const [promotions, setPromotions] = useState<Promotion[]>([])
  const [loadingData, setLoadingData] = useState(true)
  const [dataError, setDataError] = useState('')
  const [search, setSearch] = useState('')
  const [productModal, setProductModal] = useState<Product | null | false>(false)
  const [categoryModal, setCategoryModal] = useState<Category | null | false>(false)
  const [promotionModal, setPromotionModal] = useState<Promotion | null | false>(false)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  useEffect(() => {
    let mounted = true
    api<{ user: AdminUser }>('/auth/me')
      .then(({ user: currentUser }) => {
        if (mounted) setUser(currentUser)
      })
      .catch((error: unknown) => {
        if (mounted && !(error instanceof ApiError && error.status === 401)) {
          setSessionError(error instanceof Error ? error.message : 'Could not connect to the admin API.')
        }
      })
      .finally(() => {
        if (mounted) setCheckingSession(false)
      })
    return () => { mounted = false }
  }, [])

  useEffect(() => {
    if (!user) return
    let mounted = true
    Promise.all([
      api<Product[]>('/admin/products'),
      api<Category[]>('/admin/categories'),
      api<Promotion[]>('/admin/promotions'),
    ])
      .then(([productData, categoryData, promotionData]) => {
        if (!mounted) return
        setProducts(productData)
        setCategoryRecords(categoryData)
        setPromotions(promotionData)
      })
      .catch((error: unknown) => {
        if (!mounted) return
        if (error instanceof ApiError && error.status === 401) {
          setUser(null)
          setSessionError('Your session has expired. Please sign in again.')
        } else {
          setDataError(error instanceof Error ? error.message : 'Could not load store data.')
        }
      })
      .finally(() => {
        if (mounted) setLoadingData(false)
      })
    return () => { mounted = false }
  }, [user])

  const activePromotions = useMemo(() => promotions.filter((item) => item.currentlyLive), [promotions])
  const lowStock = useMemo(() => products.filter((product) => product.stock < 5), [products])
  const categoryCount = categoryRecords.length
  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase()
    return query ? products.filter((product) => `${product.name} ${product.category} ${product.sku}`.toLowerCase().includes(query)) : products
  }, [products, search])

  async function refreshData() {
    const [productData, categoryData, promotionData] = await Promise.all([
      api<Product[]>('/admin/products'),
      api<Category[]>('/admin/categories'),
      api<Promotion[]>('/admin/promotions'),
    ])
    setProducts(productData)
    setCategoryRecords(categoryData)
    setPromotions(promotionData)
  }

  async function signOut() {
    try {
      await api('/auth/sign-out', { method: 'POST' })
      setUser(null)
      setSection('Overview')
      setSessionError('')
    } catch (error) {
      setDataError(error instanceof Error ? error.message : 'Unable to sign out.')
    }
  }

  async function removeProduct(product: Product) {
    if (!window.confirm(`Remove ${product.name} from the catalog?`)) return
    try {
      await api(`/admin/products/${product.id}`, { method: 'DELETE' })
      await refreshData()
    } catch (error) {
      setDataError(error instanceof Error ? error.message : 'Unable to remove product.')
    }
  }

  async function removePromotion(promotion: Promotion) {
    if (!window.confirm(`Delete the ${promotion.title} offer?`)) return
    try {
      await api(`/admin/promotions/${promotion.id}`, { method: 'DELETE' })
      await refreshData()
    } catch (error) {
      setDataError(error instanceof Error ? error.message : 'Unable to delete offer.')
    }
  }

  async function togglePromotion(promotion: Promotion) {
    try {
      await api(`/admin/promotions/${promotion.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ active: !promotion.active }),
      })
      await refreshData()
    } catch (error) {
      setDataError(error instanceof Error ? error.message : 'Unable to update offer.')
    }
  }

  if (checkingSession) return <main className="loading-screen"><span className="loading-mark">X</span><p>Opening the house…</p></main>
  if (!user) return <>  <SignIn onSignedIn={(signedInUser) => { setSessionError(''); setDataError(''); setUser(signedInUser) }} />{sessionError && <div className="toast-error" role="alert">{sessionError}</div>}</>

  const displayName = user.firstName || user.email.split('@')[0] || 'Admin'
  const initials = `${user.firstName?.[0] ?? user.email[0] ?? 'X'}${user.lastName?.[0] ?? ''}`.toUpperCase()

  return (
    <div className="admin-shell">
      {mobileNavOpen && <button className="mobile-scrim" aria-label="Close menu" onClick={() => setMobileNavOpen(false)} />}
      <aside className={`sidebar ${mobileNavOpen ? 'sidebar-open' : ''}`}>
        <a className="brand sidebar-brand" href="#" aria-label="Xenmesh Fashion dashboard">
          <span className="brand-mark">X</span><span><strong>XENMESH</strong><small>FASHION HOUSE</small></span>
        </a>
        <span className="side-label nav-section-label">WORKSPACE</span>
        <nav className="side-nav" aria-label="Main navigation">
          {(['Overview', 'Products', 'Categories', 'Promotions'] as Section[]).map((item) => <button key={item} className={`nav-link nav-item ${section === item ? 'nav-active router-link-exact-active' : ''}`} onClick={() => { setSection(item); setMobileNavOpen(false) }}><Icon name={item === 'Overview' ? 'grid' : item === 'Products' ? 'box' : item === 'Categories' ? 'layers' : 'tag'} /><span>{item}</span>{item === 'Promotions' && activePromotions.length > 0 && <span className="nav-count">{activePromotions.length}</span>}</button>)}
        </nav>
        <span className="side-label nav-section-label side-label-lower">STORE</span>
        <nav className="side-nav"><button className={`nav-link ${section === 'Settings' ? 'nav-active' : ''}`} onClick={() => { setSection('Settings'); setMobileNavOpen(false) }}><Icon name="settings" /><span>Settings</span></button></nav>
        <div className="sidebar-bottom">
          <div className="store-card"><span className="store-card-icon"><Icon name="bag" size={18} /></span><div><strong>Your storefront</strong><a href={`${API_URL}/catalog/products`} target="_blank" rel="noreferrer">Browse public catalog <Icon name="arrow" size={12} /></a></div></div>
          <button className="profile-button" onClick={signOut} title="Sign out"><span className="avatar">{initials}</span><span className="profile-copy"><strong>{displayName}</strong><small>Store administrator</small></span><Icon name="logout" size={17} /></button>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <button className="mobile-menu icon-button" aria-label="Open navigation" onClick={() => setMobileNavOpen(true)}><Icon name="menu" /></button>
          <div className="breadcrumbs"><span>Workspace</span><Icon name="chevron" size={14} /><strong>{section}</strong></div>
          <div className="topbar-right"><span className="store-live"><i /> Store is live</span><button className="icon-button notification-button" aria-label="Notifications"><Icon name="bell" size={19} /><i /></button><span className="topbar-divider" /><span className="topbar-date">{new Intl.DateTimeFormat('en', { weekday: 'short', day: 'numeric', month: 'short' }).format(new Date())}</span></div>
        </header>

        <div className="page-content">
          <div className="welcome-row">
            <div><span className="eyebrow">XENMESH FASHION HOUSE</span><h1>{section === 'Overview' ? <>A good day to <em>make moves.</em></> : section === 'Products' ? <>Your <em>collection.</em></> : section === 'Categories' ? <>Organize your <em>collection.</em></> : section === 'Promotions' ? <>A little something <em>extra.</em></> : <>The <em>details.</em></>}</h1><p>{section === 'Overview' ? 'Here’s the latest from your store. Make it a good one.' : section === 'Products' ? 'Every piece, thoughtfully chosen and ready to be found.' : section === 'Categories' ? 'Keep your product categories tidy and easy to browse.' : section === 'Promotions' ? 'Make room for the moments worth celebrating.' : 'Your house, your details. Keep them up to date.'}</p></div>
            <div className="welcome-actions">{section !== 'Settings' && <button className="button button-dark" onClick={() => section === 'Promotions' ? setPromotionModal(null) : section === 'Categories' ? setCategoryModal(null) : setProductModal(null)}><Icon name="plus" size={17} /> {section === 'Promotions' ? 'New offer' : section === 'Categories' ? 'Add category' : 'Add product'}</button>}</div>
          </div>

          {dataError && <div className="error-banner" role="alert"><span>{dataError}</span><button onClick={() => setDataError('')}>Dismiss</button></div>}
          {loadingData && <div className="loading-line"><span /> Refreshing your store data…</div>}

          {section === 'Overview' && (
            <>
              <section className="stats-grid" aria-label="Store summary">
                <article className="stat-card"><div className="stat-top"><span>Total products</span><span className="stat-icon icon-sand"><Icon name="box" /></span></div><strong>{products.length}</strong><small>pieces in your collection</small><div className="stat-bottom"><span>Across {categoryCount} {categoryCount === 1 ? 'category' : 'categories'}</span><Icon name="arrow" size={14} /></div></article>
                <article className="stat-card"><div className="stat-top"><span>Live promotions</span><span className="stat-icon icon-lilac"><Icon name="tag" /></span></div><strong>{activePromotions.length.toString().padStart(2, '0')}</strong><small>offers running right now</small><button className="stat-bottom stat-link" onClick={() => setSection('Promotions')}><span>Manage your offers</span><Icon name="arrow" size={14} /></button></article>
                <article className="stat-card"><div className="stat-top"><span>Needs a restock</span><span className="stat-icon icon-rose"><Icon name="layers" /></span></div><strong>{lowStock.length.toString().padStart(2, '0')}</strong><small>products with fewer than 5 left</small><button className="stat-bottom stat-link" onClick={() => { setSection('Products'); setSearch('') }}><span>View inventory</span><Icon name="arrow" size={14} /></button></article>
                <article className="stat-card stat-card-accent"><div className="stat-top"><span>Your house, your rules</span><span className="stat-icon icon-white"><Icon name="calendar" /></span></div><strong className="stat-contact">Here for<br />the good stuff.</strong><small>Thoughtfully made. Always yours.</small><a className="stat-bottom" href="mailto:xen@gmail.com"><span>Get in touch · 01912444216</span><Icon name="arrow" size={14} /></a></article>
              </section>
              <section className="content-grid">
                <article className="panel collection-panel">
                  <div className="panel-heading"><div><span className="eyebrow">FRESH FROM THE RAIL</span><h2>Recently updated</h2></div><button className="text-link" onClick={() => setSection('Products')}>All products <Icon name="arrow" size={14} /></button></div>
                  {products.length ? <ProductTable products={products.slice(0, 5)} onEdit={(product) => setProductModal(product)} onDelete={removeProduct} compact /> : <EmptyState title="Your collection starts here" copy="Add your first panjabi, tee, or little everyday essential." action="Add a product" onClick={() => setProductModal(null)} />}
                </article>
                <article className="panel offers-panel">
                  <div className="panel-heading"><div><span className="eyebrow">A LITTLE SOMETHING EXTRA</span><h2>On the calendar</h2></div><button className="icon-button subtle-icon" aria-label="View all offers" onClick={() => setSection('Promotions')}><Icon name="arrow" size={17} /></button></div>
                  {promotions.length ? <div className="mini-offers">{promotions.slice(0, 4).map((promotion) => <div className="mini-offer" key={promotion.id}><span className={`offer-date ${promotion.currentlyLive ? 'offer-date-live' : ''}`}><Icon name={promotion.campaignType === 'EVENT' ? 'calendar' : 'tag'} size={17} /></span><div className="mini-offer-copy"><strong>{promotion.title}</strong><small>{promotion.discountPercent}% off · {promotion.currentlyLive ? 'Live now' : `Until ${formatDate(promotion.endsAt)}`}</small></div><span className={`status-dot ${promotion.currentlyLive ? 'status-live' : ''}`} title={promotion.currentlyLive ? 'Live now' : 'Not currently live'} /></div>)}</div> : <EmptyState title="No offers just yet" copy="Eid, New Year, or simply a little thank-you." action="Create an offer" onClick={() => setPromotionModal(null)} />}
                  <button className="offer-footer" onClick={() => setSection('Promotions')}>See all promotions <Icon name="arrow" size={14} /></button>
                </article>
              </section>
              <section className="welcome-banner"><div><span className="eyebrow">MADE FOR YOUR MOMENTS</span><h2>A season worth dressing for.</h2><p>Create a limited-time offer for Eid, New Year, or whatever comes next.</p></div><button className="button button-light" onClick={() => setPromotionModal(null)}>Plan an offer <Icon name="arrow" size={15} /></button><span className="banner-flower" aria-hidden="true">✳</span></section>
            </>
          )}

          {section === 'Products' && <section className="panel full-panel"><div className="panel-heading inventory-heading"><div><span className="eyebrow">THE COLLECTION</span><h2>Product inventory <span className="heading-count">{products.length}</span></h2></div><div className="table-actions"><label className="search-box"><Icon name="search" size={17} /><input aria-label="Search products" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search your collection" /></label><button className="button button-dark" onClick={() => setProductModal(null)}><Icon name="plus" size={17} /> Add product</button></div></div>{products.length ? filteredProducts.length ? <ProductTable products={filteredProducts} onEdit={(product) => setProductModal(product)} onDelete={removeProduct} /> : <EmptyState title="Nothing by that name" copy="Try another product name, category, or SKU." /> : <EmptyState title="A collection of your own" copy="Start with the essentials: a favorite tee, an everyday panjabi, or something made to keep." action="Add your first product" onClick={() => setProductModal(null)} />}</section>}

          {section === 'Categories' && <section className="panel full-panel"><div className="panel-heading inventory-heading"><div><span className="eyebrow">STORE ORGANIZATION</span><h2>Product categories <span className="heading-count">{categoryRecords.length}</span></h2></div><button className="button button-dark" onClick={() => setCategoryModal(null)}><Icon name="plus" size={17} /> Add category</button></div>{categoryRecords.length ? <div className="category-grid">{categoryRecords.map((category) => <article className="category-admin-card" key={category.id}><span className="stat-icon icon-lilac"><Icon name="layers" /></span><div className="category-admin-copy"><strong>{category.name}</strong><small>{category._count?.products ?? 0} {(category._count?.products ?? 0) === 1 ? 'product' : 'products'}</small></div><div className="row-actions"><button className="icon-button" aria-label={`Rename ${category.name}`} onClick={() => setCategoryModal(category)}><Icon name="settings" size={16} /></button><button className="icon-button" aria-label={`Delete ${category.name}`} onClick={async () => { if (!window.confirm(`Delete the ${category.name} category?`)) return; try { await api(`/admin/categories/${category.id}`, { method: 'DELETE' }); await refreshData() } catch (error) { setDataError(error instanceof Error ? error.message : 'Unable to delete category.') } }}><Icon name="close" size={16} /></button></div></article>)}</div> : <EmptyState title="No categories yet" copy="Start with clothing and accessories categories for your collection." action="Add a category" onClick={() => setCategoryModal(null)} />}</section>}

          {section === 'Promotions' && <section className="promotions-layout"><div className="promotion-intro"><span className="eyebrow">MAKE IT A MOMENT</span><h2>Good things<br />are <em>better shared.</em></h2><p>Set a thoughtful discount on selected pieces, a whole category, or everything in the house.</p><button className="button button-dark" onClick={() => setPromotionModal(null)}><Icon name="plus" size={17} /> Create an offer</button><div className="offer-summary"><strong>{activePromotions.length.toString().padStart(2, '0')}</strong><span>offers currently live</span></div></div>          <div className="promotion-list"><div className="panel-heading"><div><span className="eyebrow">YOUR CAMPAIGNS</span><h2>Offers & occasions</h2></div><span className="heading-count">{promotions.length}</span></div>{promotions.length ? promotions.map((promotion) => <article className={`promotion-card ${promotion.currentlyLive ? 'promotion-live' : ''}`} key={promotion.id}><div className="promotion-card-top"><span className={`campaign-icon campaign-${promotion.campaignType.toLowerCase()}`}><Icon name={promotion.campaignType === 'EVENT' ? 'calendar' : 'tag'} size={20} /></span><div className="promotion-title"><span className="eyebrow">{campaignLabel(promotion.campaignType)}</span><h3>{promotion.title}</h3></div><span className={`promotion-status ${promotion.currentlyLive ? 'promotion-status-live' : ''}`}>{promotion.status === 'LIVE' ? 'Live now' : promotion.status.charAt(0) + promotion.status.slice(1).toLowerCase()}</span><div className="promotion-actions"><button className="icon-button" aria-label={`Edit ${promotion.title}`} onClick={() => setPromotionModal(promotion)}><Icon name="settings" size={16} /></button><button className="icon-button" aria-label={`Delete ${promotion.title}`} onClick={() => removePromotion(promotion)}><Icon name="close" size={16} /></button></div></div><div className="promotion-details"><strong>{promotion.discountPercent}% <small>OFF</small></strong><div><span>{promotion.targetType === 'STOREWIDE' ? 'Entire store' : promotion.targetType === 'CATEGORY' ? promotion.targetValue : promotion.targetProductNames.join(', ') || 'Selected products'}</span><small>{formatDate(promotion.startsAt)} — {formatDate(promotion.endsAt)}</small></div><button className={`toggle-switch ${promotion.active ? 'toggle-on' : ''}`} role="switch" aria-checked={promotion.active} aria-label={`${promotion.active ? 'Pause' : 'Activate'} ${promotion.title}`} onClick={() => togglePromotion(promotion)}><span /></button></div></article>) : <EmptyState title="Every occasion is an opportunity" copy="Make an Eid edit, welcome the New Year, or give a favorite category its moment." action="Create your first offer" onClick={() => setPromotionModal(null)} />}</div></section>}

          {section === 'Settings' && <section className="settings-layout"><article className="panel settings-card"><span className="eyebrow">YOUR STORE</span><h2>House details</h2><p>A few ways to reach you, and a little about the home you’ve made here.</p><dl className="settings-list"><div><dt>Store name</dt><dd>Xenmesh Fashion House</dd></div><div><dt>Contact email</dt><dd><a href="mailto:xen@gmail.com">xen@gmail.com</a></dd></div><div><dt>Phone</dt><dd><a href="tel:01912444216">01912444216</a></dd></div><div><dt>Administrator</dt><dd>{user.email}</dd></div></dl></article><article className="panel settings-card"><span className="eyebrow">PUBLIC CATALOG</span><h2>Your storefront endpoint</h2><p>Products and active promotions can be browsed publicly. Managing your catalog stays behind your admin sign-in.</p><div className="endpoint-row"><code>GET {API_URL}/catalog/products</code><a href={`${API_URL}/catalog/products`} target="_blank" rel="noreferrer" aria-label="Open public product endpoint"><Icon name="arrow" size={16} /></a></div><div className="endpoint-row"><code>GET {API_URL}/catalog/promotions</code><a href={`${API_URL}/catalog/promotions`} target="_blank" rel="noreferrer" aria-label="Open public promotions endpoint"><Icon name="arrow" size={16} /></a></div></article></section>}
        </div>
        <footer className="page-footer"><span>© {new Date().getFullYear()} Xenmesh Fashion House</span><span>Made with care, in Dhaka <span className="footer-star">✳</span></span></footer>
      </main>

      {productModal !== false && <ProductModal product={productModal} categories={categoryRecords.filter((category) => category.active)} onClose={() => setProductModal(false)} onSaved={refreshData} />}
      {categoryModal !== false && <CategoryModal category={categoryModal} onClose={() => setCategoryModal(false)} onSaved={refreshData} />}
      {promotionModal !== false && <PromotionModal promotion={promotionModal} products={products} categories={categoryRecords.filter((category) => category.active)} onClose={() => setPromotionModal(false)} onSaved={refreshData} />}
    </div>
  )
}

function ProductTable({
  products,
  onEdit,
  onDelete,
  compact = false,
}: {
  products: Product[]
  onEdit: (product: Product) => void
  onDelete: (product: Product) => void
  compact?: boolean
}) {
  return (
    <div className="table-scroll"><table className="product-table admin-table"><thead><tr><th>PRODUCT</th><th>CATEGORY</th><th>SKU</th><th>PRICE</th><th>STOCK</th><th aria-label="Actions" /></tr></thead><tbody>{products.map((product, index) => <tr key={product.id}><td><div className="product-cell"><span className={`product-swatch swatch-${index % 5}`}><Icon name="bag" size={18} /></span><span><strong>{product.name}</strong>{!compact && <small>Updated {formatDate(product.updatedAt)}</small>}</span></div></td><td><span className="category-pill">{product.category}</span></td><td className="sku-cell">{product.sku}</td><td className="price-cell">{formatPrice(product.price)}</td><td><span className={`stock-value ${product.stock < 5 ? 'stock-low' : ''}`}><i />{product.stock} {product.stock === 1 ? 'piece' : 'pieces'}</span></td><td><div className="row-actions"><button className="icon-button" aria-label={`Edit ${product.name}`} onClick={() => onEdit(product)}><Icon name="settings" size={16} /></button><button className="icon-button" aria-label={`Delete ${product.name}`} onClick={() => onDelete(product)}><Icon name="close" size={16} /></button></div></td></tr>)}</tbody></table></div>
  )
}

function EmptyState({ title, copy, action, onClick }: { title: string; copy: string; action?: string; onClick?: () => void }) {
  return <div className="empty-state"><span className="empty-icon"><Icon name="layers" size={22} /></span><h3>{title}</h3><p>{copy}</p>{action && onClick && <button className="text-link" onClick={onClick}>{action} <Icon name="arrow" size={14} /></button>}</div>
}

export default App
