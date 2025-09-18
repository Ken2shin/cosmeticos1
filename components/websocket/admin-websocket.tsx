"use client"

import { useEffect, useRef } from "react"
import { io, type Socket } from "socket.io-client"
import { useToast } from "@/hooks/use-toast"

export function AdminWebSocket() {
  const socketRef = useRef<Socket | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    if (process.env.NODE_ENV === "production" && process.env.VERCEL) {
      console.log("[v0] Admin WebSocket disabled in Vercel production environment")
      return
    }

    const initializeSocket = () => {
      const socketUrl =
        process.env.NODE_ENV === "production"
          ? process.env.NEXT_PUBLIC_APP_URL || window.location.origin
          : "http://localhost:3000"

      console.log("[v0] Admin initializing WebSocket connection to:", socketUrl)

      socketRef.current = io(socketUrl, {
        transports: ["polling", "websocket"],
        timeout: 20000,
        forceNew: true,
        upgrade: true,
        rememberUpgrade: false,
        reconnectionAttempts: 2,
      })

      const socket = socketRef.current

      socket.on("connect", () => {
        console.log("[v0] Admin WebSocket connected:", socket.id)
        socket.emit("join-admin")
      })

      socket.on("disconnect", (reason) => {
        console.log("[v0] Admin WebSocket disconnected:", reason)
      })

      socket.on("product-created", (productData) => {
        console.log("[v0] Admin: Product created:", productData)
        window.dispatchEvent(new CustomEvent("productCreated", { detail: productData }))
      })

      socket.on("product-updated", (productData) => {
        console.log("[v0] Admin: Product updated:", productData)
        window.dispatchEvent(new CustomEvent("productUpdated", { detail: productData }))
      })

      socket.on("product-deleted", ({ productId }) => {
        console.log("[v0] Admin: Product deleted:", productId)
        window.dispatchEvent(new CustomEvent("productDeleted", { detail: { productId } }))
      })

      socket.on("stock-updated", ({ productId, newStock }) => {
        console.log("[v0] Admin: Stock updated:", { productId, newStock })
        window.dispatchEvent(
          new CustomEvent("stockUpdated", {
            detail: { productId, newStock },
          }),
        )
      })

      socket.on("inventory-changed", (inventoryData) => {
        console.log("[v0] Admin: Inventory changed:", inventoryData)
        window.dispatchEvent(new CustomEvent("inventoryChanged", { detail: inventoryData }))
      })

      socket.on("new-order", (orderData) => {
        console.log("[v0] Admin: New order received:", orderData)
        window.dispatchEvent(new CustomEvent("newOrder", { detail: orderData }))

        toast({
          title: "Nuevo pedido recibido",
          description: `Pedido #${orderData.id} de ${orderData.customer_name}`,
          variant: "default",
        })
      })

      socket.on("order-deleted", ({ orderId }) => {
        console.log("[v0] Admin: Order deleted:", orderId)
        window.dispatchEvent(new CustomEvent("orderDeleted", { detail: { orderId } }))
      })

      socket.on("customer-deleted", ({ customerId }) => {
        console.log("[v0] Admin: Customer deleted:", customerId)
        window.dispatchEvent(new CustomEvent("customerDeleted", { detail: { customerId } }))
      })

      socket.on("connect_error", (error) => {
        console.error("[v0] Admin WebSocket connection error:", error)
        if (process.env.NODE_ENV === "development") {
          toast({
            title: "Error de conexión",
            description: "Problema con la conexión en tiempo real. Recarga la página.",
            variant: "destructive",
          })
        }
      })

      socket.on("error", (error) => {
        console.error("[v0] Admin WebSocket error:", error)
      })
    }

    initializeSocket()

    return () => {
      if (socketRef.current) {
        console.log("[v0] Cleaning up admin WebSocket connection")
        socketRef.current.disconnect()
        socketRef.current = null
      }
    }
  }, [toast])

  useEffect(() => {
    if (process.env.NODE_ENV === "production" && process.env.VERCEL) {
      return
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && socketRef.current?.disconnected) {
        console.log("[v0] Admin page became visible, reconnecting WebSocket")
        socketRef.current.connect()
      }
    }

    const handleOnline = () => {
      if (socketRef.current?.disconnected) {
        console.log("[v0] Admin came back online, reconnecting WebSocket")
        socketRef.current.connect()
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange)
    window.addEventListener("online", handleOnline)

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange)
      window.removeEventListener("online", handleOnline)
    }
  }, [])

  return null
}
