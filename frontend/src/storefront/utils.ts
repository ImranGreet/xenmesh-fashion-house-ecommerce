import type { Product } from './types'

export const API_URL = (import.meta.env.VITE_API_URL ?? 'http://localhost:3001').replace(/\/$/, '')

const editorialImages = [
  'photo-1618354691373-d851c5c3a990',
  'photo-1598033129183-c4f50c736f10',
  'photo-1521572163474-6864f9cf17ab',
  'photo-1618354691229-88d47f285158',
  'photo-1591047139829-d91aecb6caea',
  'photo-1627225924765-552d49cf47ad',
]

export function imageUrl(id: string, width = 720) {
  return `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${width}&q=85`
}

export function imageFor(product: Product, index: number) {
  const category = product.category.toLowerCase()
  if (category.includes('panjabi')) return editorialImages[1]
  if (category.includes('shirt') || category.includes('tee')) return editorialImages[2]
  if (category.includes('wallet') || category.includes('accessor')) return editorialImages[4]
  if (category.includes('dress')) return editorialImages[3]
  return editorialImages[(product.id + index) % editorialImages.length]
}

export function formatPrice(value: number) {
  return new Intl.NumberFormat('en-BD', {
    style: 'currency',
    currency: 'BDT',
    maximumFractionDigits: 0,
  }).format(value)
}
