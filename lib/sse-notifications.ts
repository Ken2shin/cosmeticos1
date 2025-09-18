const sseConnections: Set<ReadableStreamDefaultController> = new Set()

export function addSSEConnection(controller: ReadableStreamDefaultController) {
  sseConnections.add(controller)
  console.log(`[SSE] Connection added. Total connections: ${sseConnections.size}`)
}

export function removeSSEConnection(controller: ReadableStreamDefaultController) {
  sseConnections.delete(controller)
  console.log(`[SSE] Connection removed. Total connections: ${sseConnections.size}`)
}

function broadcast(event: string, data: any) {
  const message = `data: ${JSON.stringify({ type: event, data })}\n\n`
  const encoder = new TextEncoder()
  const encodedMessage = encoder.encode(message)

  // Remove closed connections
  const closedConnections: ReadableStreamDefaultController[] = []

  sseConnections.forEach((controller) => {
    try {
      controller.enqueue(encodedMessage)
    } catch (error) {
      console.log("[SSE] Connection closed, removing from set")
      closedConnections.push(controller)
    }
  })

  // Clean up closed connections
  closedConnections.forEach((controller) => {
    sseConnections.delete(controller)
  })

  console.log(`[SSE] Broadcasted ${event} to ${sseConnections.size} connections`)
}

// Product-related notifications
export function notifyNewProduct(product: any) {
  broadcast("new-product", product)
}

export function notifyProductUpdated(product: any) {
  broadcast("product-updated", product)
}

export function notifyProductDeleted(productId: string) {
  broadcast("product-deleted", { productId })
}

// Stock and inventory notifications
export function notifyStockUpdated(productId: string, newStock: number) {
  broadcast("stock-updated", { productId, newStock })
}

export function notifyInventoryChanged(inventoryData: any) {
  broadcast("inventory-changed", inventoryData)
}

// Order notifications
export function notifyNewOrder(order: any) {
  broadcast("new-order", order)
  broadcast("order-confirmed", order)
}

export function notifyOrderDeleted(orderId: string) {
  broadcast("order-deleted", { orderId })
}

// Customer notifications
export function notifyCustomerDeleted(customerId: string) {
  broadcast("customer-deleted", { customerId })
}

// General notifications
export function notifyDataUpdate(type: string, data: any) {
  broadcast("data-update", { type, data })
}
