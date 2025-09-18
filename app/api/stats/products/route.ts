import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { cookies } from "next/headers"
import { validateDatabaseUrl } from "@/lib/env-validation"

export const dynamic = "force-dynamic"

const sql = neon(validateDatabaseUrl())

export async function GET() {
  try {
    console.log("[v0] Admin products API called")

    const cookieStore = await cookies()
    const token = cookieStore.get("admin-token")

    console.log("[v0] Token check:", token?.value ? "present" : "missing")

    if (!token?.value || token.value !== "authenticated") {
      console.log("[v0] Unauthorized access attempt")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const productStats = await sql`
      SELECT 
        p.*,
        c.name as category_name,
        COALESCE(SUM(oi.quantity), 0) as total_sold,
        COALESCE(SUM(oi.total_price), 0) as total_revenue,
        COALESCE(COUNT(DISTINCT o.id), 0) as total_orders
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN order_items oi ON p.id = oi.product_id
      LEFT JOIN orders o ON oi.order_id = o.id
      GROUP BY p.id, c.name
      ORDER BY total_revenue DESC
    `

    return NextResponse.json(productStats)
  } catch (error) {
    console.error("[v0] Error fetching product stats:", error)
    return NextResponse.json(
      {
        error: "Failed to fetch product stats",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
