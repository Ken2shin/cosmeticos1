import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET() {
  try {
    console.log("[v0] Admin Stats API: Fetching real-time dashboard statistics")

    const productsResult = await sql`SELECT COUNT(*) as count FROM products WHERE is_active = true`
    console.log("[v0] Products count result:", productsResult)

    const ordersResult = await sql`SELECT COUNT(*) as count FROM orders`
    console.log("[v0] Orders count result:", ordersResult)

    const revenueResult = await sql`SELECT COALESCE(SUM(total_amount), 0) as total FROM orders`
    console.log("[v0] Revenue result:", revenueResult)

    const customersResult = await sql`SELECT COUNT(DISTINCT customer_email) as count FROM orders`
    console.log("[v0] Customers result:", customersResult)

    const stats = {
      totalProducts: Number.parseInt(productsResult[0]?.count || "0"),
      totalOrders: Number.parseInt(ordersResult[0]?.count || "0"),
      totalRevenue: Number.parseFloat(revenueResult[0]?.total || "0"),
      activeCustomers: Number.parseInt(customersResult[0]?.count || "0"),
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
