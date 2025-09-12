import { NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function POST(request: Request) {
  try {
    const { type, title, message, data } = await request.json()

    try {
      await sql`SELECT 1 FROM push_subscriptions LIMIT 1`
    } catch (tableError) {
      console.log("[v0] Push subscriptions table doesn't exist, creating it...")
      await sql`
        CREATE TABLE IF NOT EXISTS push_subscriptions (
          id SERIAL PRIMARY KEY,
          user_type VARCHAR(50) NOT NULL DEFAULT 'admin',
          endpoint TEXT NOT NULL,
          p256dh TEXT,
          auth TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `
    }

    // Obtener suscripciones de administradores para notificaciones de pedidos
    const subscriptions = await sql`
      SELECT * FROM push_subscriptions
      WHERE user_type = 'admin'
    `

    const pushPromises = subscriptions.map(async (subscription) => {
      try {
        const payload = JSON.stringify({
          title: title || "Nueva Lista de Pedido",
          body: message,
          data: {
            type: type || "new_order",
            ...data,
            url: "/admin",
            timestamp: new Date().toISOString(),
          },
          icon: "/favicon.ico",
          badge: "/favicon.ico",
          tag: `order-${data?.orderId || Date.now()}`,
          requireInteraction: true, // Requiere interacción para listas de pedidos importantes
          actions: [
            {
              action: "view",
              title: "Ver Pedido",
            },
            {
              action: "dismiss",
              title: "Cerrar",
            },
          ],
        })

        console.log(`[v0] Enviando notificación de lista de pedido:`, {
          customer: data?.customerName,
          phone: data?.customerPhone,
          total: data?.total,
          items: data?.items?.length,
        })

        if (typeof window !== "undefined" && "serviceWorker" in navigator) {
          navigator.serviceWorker.ready.then((registration) => {
            registration.showNotification(title, {
              body: message,
              icon: "/favicon.ico",
              badge: "/favicon.ico",
              tag: `order-${data?.orderId}`,
              requireInteraction: true,
              vibrate: [200, 100, 200],
              sound: "/notification-sound.mp3",
            })
          })
        }

        return true
      } catch (error) {
        console.error("Error enviando push notification:", error)
        return false
      }
    })

    const results = await Promise.all(pushPromises)
    const successCount = results.filter(Boolean).length

    return NextResponse.json({
      success: true,
      sent: successCount,
      total: subscriptions.length,
      message: `Notificación de lista de pedido enviada a ${successCount} administradores`,
    })
  } catch (error) {
    console.error("Error broadcasting notifications:", error)
    return NextResponse.json({ error: "Failed to broadcast notifications" }, { status: 500 })
  }
}
