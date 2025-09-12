const { Server } = require("socket.io")

let io = null

function initializeWebSocket(server) {
  io = new Server(server, {
    cors: {
      origin: process.env.NODE_ENV === "production" ? process.env.NEXT_PUBLIC_APP_URL : "http://localhost:3000",
      methods: ["GET", "POST"],
    },
  })

  io.on("connection", (socket) => {
    console.log("[WebSocket] Client connected:", socket.id)

    socket.on("join-admin", () => {
      socket.join("admin")
      console.log("[WebSocket] Admin joined:", socket.id)
    })

    socket.on("join-client", () => {
      socket.join("client")
      console.log("[WebSocket] Client joined:", socket.id)
    })

    socket.on("disconnect", () => {
      console.log("[WebSocket] Client disconnected:", socket.id)
    })
  })

  return io
}

function notifyNewProduct(productData) {
  if (io) {
    io.to("client").emit("new-product", productData)
    console.log("[WebSocket] New product notification sent to clients")
  }
}

function notifyNewOrder(orderData) {
  if (io) {
    io.to("admin").emit("new-order", orderData)
    console.log("[WebSocket] New order notification sent to admin")
  }
}

function notifyOrderConfirmed(orderData) {
  if (io) {
    io.to("client").emit("order-confirmed", orderData)
    console.log("[WebSocket] Order confirmation sent to client")
  }
}

module.exports = {
  initializeWebSocket,
  notifyNewProduct,
  notifyNewOrder,
  notifyOrderConfirmed,
}
