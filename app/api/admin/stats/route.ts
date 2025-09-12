import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { validateDatabaseUrl } from "@/lib/env-validation"

const sql = neon(validateDatabaseUrl())

export async function GET() {
  try {
    console.log("[v0] Admin Stats API: Fetching real-time dashboard statistics")

    const [productsResult, ordersResult, revenueResult, customersResult] = await Promise.all([
      sql`SELECT COUNT(*) as count FROM products WHERE is_active = true`,
      sql`SELECT COUNT(*) as count FROM orders`,
      sql`SELECT COALESCE(SUM(total_amount), 0) as total FROM orders`,
      sql`SELECT COUNT(DISTINCT customer_email) as count FROM orders`,
    ])

    const stats = {
      totalProducts: Number.parseInt(productsResult[0].count),
      totalOrders: Number.parseInt(ordersResult[0].count),
      totalRevenue: Number.parseFloat(revenueResult[0].total),
      activeCustomers: Number.parseInt(customersResult[0].count),
    }

    console.log("[v0] Admin Stats API: Statistics calculated:", stats)

    return NextResponse.json(stats)
  } catch (error) {
    console.error("[v0] Admin Stats API: Error fetching stats:", error)
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 })
  }
}
