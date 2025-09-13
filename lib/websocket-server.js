const { Server: SocketIOServer } = require("socket.io")

let io = null

function initializeWebSocket(server) {
  io = new SocketIOServer(server, {
    cors: {
      origin:
        process.env.NODE_ENV === "production"
          ? [process.env.NEXT_PUBLIC_APP_URL, process.env.VERCEL_URL].filter(Boolean)
          : ["http://localhost:3000", "http://127.0.0.1:3000"],
      methods: ["GET", "POST"],
      credentials: true,
    },
    transports: ["websocket", "polling"],
    pingTimeout: 60000,
    pingInterval: 25000,
    connectTimeout: 45000,
  })

  io.on("connection", (socket) => {
    console.log("[WebSocket] New client connected:", socket.id)

    socket.on("join-client", () => {
      console.log("[WebSocket] Client joined:", socket.id)
      socket.join("clients")
    })

    socket.on("join-admin", () => {
      console.log("[WebSocket] Admin joined:", socket.id)
      socket.join("admins")
    })

    socket.on("disconnect", (reason) => {
      console.log("[WebSocket] Client disconnected:", socket.id, reason)
    })

    socket.on("error", (error) => {
      console.error("[WebSocket] Socket error:", error)
    })
  })

  io.engine.on("connection_error", (err) => {
    console.error("[WebSocket] Connection error:", err.req, err.code, err.message, err.context)
  })

  console.log("[WebSocket] Socket.IO server initialized")
}

function broadcast(event, data, room) {
  if (!io) {
    console.warn("[WebSocket] Socket.IO server not initialized")
    return
  }

  try {
    const target = room ? io.to(room) : io
    target.emit(event, data)
    console.log(`[WebSocket] Broadcasted ${event} to ${room || "all clients"}`)
  } catch (error) {
    console.error("[WebSocket] Broadcast error:", error)
  }
}

// Product-related notifications
function notifyNewProduct(product) {
  broadcast("new-product", product)
}

function notifyProductUpdated(product) {
  broadcast("product-updated", product)
}

function notifyProductDeleted(productId) {
  broadcast("product-deleted", { productId })
}

// Stock and inventory notifications
function notifyStockUpdated(productId, newStock) {
  broadcast("stock-updated", { productId, newStock })
}

function notifyInventoryChanged(inventoryData) {
  broadcast("inventory-changed", inventoryData)
}

// Order notifications
function notifyNewOrder(order) {
  broadcast("new-order", order)
  broadcast("order-confirmed", order, "clients")
}

function notifyOrderDeleted(orderId) {
  broadcast("order-deleted", { orderId })
}

// Customer notifications
function notifyCustomerDeleted(customerId) {
  broadcast("customer-deleted", { customerId })
}

// General notifications
function notifyDataUpdate(type, data) {
  broadcast("data-update", { type, data })
}

module.exports = {
  initializeWebSocket,
  notifyNewProduct,
  notifyProductUpdated,
  notifyProductDeleted,
  notifyStockUpdated,
  notifyInventoryChanged,
  notifyNewOrder,
  notifyOrderDeleted,
  notifyCustomerDeleted,
  notifyDataUpdate,
}
