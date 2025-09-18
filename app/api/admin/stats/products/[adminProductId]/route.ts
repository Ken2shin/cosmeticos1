import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { validateDatabaseUrl } from "@/lib/env-validation"
import { cookies } from "next/headers"

export const dynamic = "force-dynamic"

const sql = neon(validateDatabaseUrl())

export async function GET(request: Request, { params }: { params: { adminProductId: string } }) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get("admin-token")

    if (!token?.value || token.value !== "authenticated") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const productId = Number.parseInt(params.adminProductId)

    if (isNaN(productId) || productId <= 0) {
      return NextResponse.json({ error: "Invalid product ID" }, { status: 400 })
    }

    // Get product stats including sales data
    const productStats = await sql`
      SELECT 
        p.*,
        c.name as category_name,
        COALESCE(SUM(oi.quantity), 0) as total_sold,
        COALESCE(SUM(oi.total_price), 0) as total_revenue,
        COALESCE(COUNT(DISTINCT o.id), 0) as total_orders,
        COALESCE(AVG(oi.unit_price), p.price) as avg_selling_price
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN order_items oi ON p.id = oi.product_id
      LEFT JOIN orders o ON oi.order_id = o.id
      WHERE p.id = ${productId}
      GROUP BY p.id, c.name
    `

    if (productStats.length === 0) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 })
    }

    // Get recent orders for this product
    const recentOrders = await sql`
      SELECT 
        o.id,
        o.customer_name,
        o.customer_email,
        o.created_at,
        oi.quantity,
        oi.unit_price,
        oi.total_price
      FROM orders o
      JOIN order_items oi ON o.id = oi.order_id
      WHERE oi.product_id = ${productId}
      ORDER BY o.created_at DESC
      LIMIT 10
    `

    // Get inventory history for this product
    const inventoryHistory = await sql`
      SELECT 
        i.*,
        i.purchase_date,
        i.purchase_price,
        i.purchase_quantity
      FROM inventory i
      WHERE i.product_id = ${productId}
      ORDER BY i.purchase_date DESC
      LIMIT 10
    `

    const stats = {
      ...productStats[0],
      recent_orders: recentOrders,
      inventory_history: inventoryHistory,
      profit_per_unit: Number(productStats[0].price) - Number(productStats[0].cost_price || 0),
      profit_margin:
        productStats[0].price > 0
          ? ((Number(productStats[0].price) - Number(productStats[0].cost_price || 0)) /
              Number(productStats[0].price)) *
            100
          : 0,
    }

    return NextResponse.json(stats)
  } catch (error) {
    console.error("Error fetching product stats:", error)
    return NextResponse.json({ error: "Failed to fetch product stats" }, { status: 500 })
  }
}
