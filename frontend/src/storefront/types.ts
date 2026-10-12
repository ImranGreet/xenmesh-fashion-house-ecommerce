export type Product = {
  id: number
  name: string
  category: string
  sku: string
  description: string | null
  price: number
  salePrice?: number
  discountPercent?: number
  promotion?: string
  stock: number
}

export type Category = {
  id: number
  name: string
  slug: string
}

export type CartItem = {
  product: Product
  quantity: number
}

export type OrderConfirmation = {
  number: string
  total: number
}
