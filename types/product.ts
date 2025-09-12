export interface Product {
  id: number
  name: string
  description: string | null
  price: number
  category: string
  brand: string | null
  image_url: string | null
  stock_quantity: number
  is_active: boolean
  created_at: string
  updated_at: string
  sku: string
  currency_code?: string
}

export interface Category {
  id: number
  name: string
  description: string | null
  created_at: string
}

export interface Order {
  id: number
  customer_name: string
  customer_email: string
  customer_phone: string | null
  total_amount: number
  status: string
  created_at: string
  updated_at: string
}

export interface OrderItem {
  id: number
  order_id: number
  product_id: number
  quantity: number
  unit_price: number
  total_price: number
}
