"use client"

import { useEffect, useRef } from "react"
import { io, type Socket } from "socket.io-client"
import { useToast } from "@/hooks/use-toast"

export function ClientWebSocket() {
  const socketRef = useRef<Socket | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    const initializeSocket = () => {
      const socketUrl =
        process.env.NODE_ENV === "production" ? process.env.NEXT_PUBLIC_APP_URL : "https://cosmeticos-jwwe.vercel.app/"

      socketRef.current = io(socketUrl, {
        transports: ["websocket", "polling"],
        timeout: 20000,
        forceNew: true,
      })

      const socket = socketRef.current

      socket.on("connect", () => {
        console.log("[v0] Client WebSocket connected:", socket.id)
        socket.emit("join-client")
      })

      socket.on("disconnect", (reason) => {
        console.log("[v0] Client WebSocket disconnected:", reason)
      })

      socket.on("new-product", (productData) => {
        console.log("[v0] New product received:", productData)
        window.dispatchEvent(new CustomEvent("productCreated", { detail: productData }))

        toast({
          title: "Nuevo producto disponible",
          description: `${productData.name} ha sido agregado al catálogo`,
          variant: "default",
        })
      })

      socket.on("product-updated", (productData) => {
        console.log("[v0] Product updated:", productData)
        window.dispatchEvent(new CustomEvent("productUpdated", { detail: productData }))
      })

      socket.on("product-deleted", ({ productId }) => {
        console.log("[v0] Product deleted:", productId)
        window.dispatchEvent(new CustomEvent("productDeleted", { detail: { productId } }))
      })

      socket.on("stock-updated", ({ productId, newStock }) => {
        console.log("[v0] Stock updated:", { productId, newStock })
        window.dispatchEvent(
          new CustomEvent("stockUpdated", {
            detail: { productId, newStock },
          }),
        )
      })

      socket.on("inventory-changed", (inventoryData) => {
        console.log("[v0] Inventory changed:", inventoryData)
        window.dispatchEvent(new CustomEvent("inventoryChanged", { detail: inventoryData }))
      })

      socket.on("order-confirmed", (orderData) => {
        console.log("[v0] Order confirmed:", orderData)
        toast({
          title: "Pedido confirmado",
          description: `Tu pedido #${orderData.id} ha sido confirmado`,
          variant: "default",
        })
      })

      socket.on("connect_error", (error) => {
        console.error("[v0] WebSocket connection error:", error)
      })

      socket.on("error", (error) => {
        console.error("[v0] WebSocket error:", error)
      })
    }

    initializeSocket()

    return () => {
      if (socketRef.current) {
        console.log("[v0] Cleaning up client WebSocket connection")
        socketRef.current.disconnect()
        socketRef.current = null
      }
    }
  }, [toast])

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && socketRef.current?.disconnected) {
        console.log("[v0] Page became visible, reconnecting WebSocket")
        socketRef.current.connect()
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange)

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange)
    }
  }, [])

  return null
}
