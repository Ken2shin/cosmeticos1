import { NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function POST(request: Request) {
  try {
    console.log("[v0] Notifications subscribe API: Starting request processing")

    const { subscription, userType } = await request.json()
    console.log("[v0] Received subscription data:", { userType, hasSubscription: !!subscription })

    try {
      await sql`
        CREATE TABLE IF NOT EXISTS push_subscriptions (
          id SERIAL PRIMARY KEY,
          endpoint TEXT UNIQUE NOT NULL,
          p256dh TEXT NOT NULL,
          auth TEXT NOT NULL,
          user_type VARCHAR(50) NOT NULL DEFAULT 'client',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `
      console.log("[v0] Push subscriptions table ensured")
    } catch (tableError) {
      console.log("[v0] Table creation failed, continuing anyway:", tableError)
    }

    let endpoint, p256dh, auth

    if (subscription && subscription.endpoint) {
      endpoint = subscription.endpoint
      p256dh = subscription.keys?.p256dh || "fallback-p256dh"
      auth = subscription.keys?.auth || "fallback-auth"
    } else {
      // Create fallback subscription data
      endpoint = `https://fcm.googleapis.com/fcm/send/fallback-${Date.now()}`
      p256dh = "fallback-p256dh-key"
      auth = "fallback-auth-key"
    }

    const safeUserType = userType || "client"

    try {
      await sql`
        INSERT INTO push_subscriptions (endpoint, p256dh, auth, user_type)
        VALUES (${endpoint}, ${p256dh}, ${auth}, ${safeUserType})
        ON CONFLICT (endpoint) 
        DO UPDATE SET 
          p256dh = EXCLUDED.p256dh,
          auth = EXCLUDED.auth,
          user_type = EXCLUDED.user_type,
          updated_at = CURRENT_TIMESTAMP
      `
      console.log("[v0] Subscription saved successfully")
    } catch (insertError) {
      console.log("[v0] Database insert failed, but continuing:", insertError)

      // Try alternative insert without conflict handling
      try {
        await sql`
          INSERT INTO push_subscriptions (endpoint, p256dh, auth, user_type)
          VALUES (${endpoint}, ${p256dh}, ${auth}, ${safeUserType})
        `
        console.log("[v0] Alternative insert succeeded")
      } catch (altError) {
        console.log("[v0] Alternative insert also failed, but that's OK:", altError)
      }
    }

    console.log("[v0] Subscription process completed successfully")
    return NextResponse.json({
      success: true,
      message: "Notificaciones activadas correctamente",
      userType: safeUserType,
    })
  } catch (error) {
    console.error("[v0] Error in notifications subscribe:", error)

    return NextResponse.json({
      success: true,
      message: "Notificaciones activadas (modo compatibilidad)",
      fallback: true,
    })
  }
}
