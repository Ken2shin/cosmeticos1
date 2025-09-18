import { NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function GET() {
  try {
    console.log("[v0] Admin Stats API: Fetching real-time dashboard statistics")

    const [productsResult, ordersResult, revenueResult, customersResult] = await Promise.allSettled([
      sql`SELECT COUNT(*) as count FROM products WHERE is_active = true`,
      sql`SELECT COUNT(*) as count FROM orders`,
      sql`SELECT COALESCE(SUM(total_amount), 0) as total FROM orders`,
      sql`SELECT COUNT(DISTINCT customer_email) as count FROM orders`,
    ])

    const stats = {
      totalProducts: productsResult.status === "fulfilled" ? Number.parseInt(productsResult.value[0]?.count || "0") : 0,
      totalOrders: ordersResult.status === "fulfilled" ? Number.parseInt(ordersResult.value[0]?.count || "0") : 0,
      totalRevenue: revenueResult.status === "fulfilled" ? Number.parseFloat(revenueResult.value[0]?.total || "0") : 0,
      activeCustomers:
        customersResult.status === "fulfilled" ? Number.parseInt(customersResult.value[0]?.count || "0") : 0,
    }

    console.log("[v0] Admin Stats API: Statistics calculated:", stats)
    return NextResponse.json(stats)
  } catch (error) {
    console.error("[v0] Admin Stats API: Error fetching stats:", error)

    const defaultStats = {
      totalProducts: 0,
      totalOrders: 0,
      totalRevenue: 0,
      activeCustomers: 0,
    }

    return NextResponse.json(defaultStats)
  }
}
