export interface ProductCreatedEvent extends CustomEvent {
  detail: {
    id: number
    name: string
    brand: string
    price: number
    stock_quantity: number
    cost_price?: number
    is_active: boolean
  }
}

export interface ProductUpdatedEvent extends CustomEvent {
  detail: {
    id: number
    name: string
    brand: string
    price: number
    stock_quantity: number
    cost_price?: number
    is_active: boolean
  }
}

export interface ProductDeletedEvent extends CustomEvent {
  detail: {
    productId: number
  }
}

export interface StockUpdatedEvent extends CustomEvent {
  detail: {
    productId: number
    newStock: number
  }
}

export interface InventoryChangedEvent extends CustomEvent {
  detail: {
    id: number
    product_id: number
    purchase_price: number
    purchase_quantity: number
    supplier_name?: string
    supplier_contact?: string
    notes?: string
    product_name?: string
    action: "created" | "updated" | "deleted"
  }
}

export interface NewOrderEvent extends CustomEvent {
  detail: {
    id: number
    customer_name: string
    customer_email?: string
    customer_phone?: string
    total_amount: number
    status: string
    items: Array<{
      product_id: number
      quantity: number
      unit_price: number
      total_price: number
    }>
  }
}

export interface OrderDeletedEvent extends CustomEvent {
  detail: {
    orderId: number
  }
}

export interface CustomerDeletedEvent extends CustomEvent {
  detail: {
    customerId: number
  }
}

// Global event map for type safety
declare global {
  interface WindowEventMap {
    productCreated: ProductCreatedEvent
    productUpdated: ProductUpdatedEvent
    productDeleted: ProductDeletedEvent
    stockUpdated: StockUpdatedEvent
    inventoryChanged: InventoryChangedEvent
    newOrder: NewOrderEvent
    orderDeleted: OrderDeletedEvent
    customerDeleted: CustomerDeletedEvent
  }
}
