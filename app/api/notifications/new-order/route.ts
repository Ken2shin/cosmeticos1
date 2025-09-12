import { NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function POST(request: Request) {
  try {
    const { orderId, customerName, customerPhone, total } = await request.json()

    // Obtener todas las suscripciones push de administradores
    const subscriptions = await sql`
      SELECT * FROM push_subscriptions
    `

    // Enviar notificación push a todos los administradores
    const pushPromises = subscriptions.map(async (subscription) => {
      try {
        const payload = JSON.stringify({
          title: "🛍️ Nuevo Pedido Recibido",
          body: `${customerName} (${customerPhone}) - Total: $${total}`,
          data: {
            orderId,
            customerName,
            customerPhone,
            total,
            url: "/admin",
          },
        })

        // Aquí normalmente usarías web-push library para enviar la notificación
        // Por ahora, simularemos el envío
        console.log("Enviando notificación push:", payload)

        return true
      } catch (error) {
        console.error("Error enviando push notification:", error)
        return false
      }
    })

    await Promise.all(pushPromises)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error enviando notificaciones:", error)
    return NextResponse.json({ error: "Failed to send notifications" }, { status: 500 })
  }
}
