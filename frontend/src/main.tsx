import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Route, Routes } from 'react-router'
import './index.css'
import AdminApp from './App.tsx'
import Storefront from './Storefront.tsx'
import { ProductDetailsPage } from './storefront/components/ProductDetailsPage'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Storefront />} />
        <Route path="/products/:productId" element={<ProductDetailsPage />} />
        <Route path="/admin/*" element={<AdminApp />} />
        <Route path="*" element={<main className="product-detail-state"><span className="store-eyebrow">XENMESH FASHION HOUSE</span><h1>We could not find that page.</h1><a className="hero-cta" href="/">Back to the collection <span aria-hidden="true">↗</span></a></main>} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
