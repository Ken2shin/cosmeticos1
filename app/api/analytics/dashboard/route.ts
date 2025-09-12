import { NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function GET() {
  try {
    const today = new Date()
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
    const startOfWeek = new Date(today.setDate(today.getDate() - today.getDay()))
    const yesterday = new Date(today.setDate(today.getDate() - 1))

    // Today's stats
    const todayStats = await sql`
      SELECT 
        COUNT(DISTINCT o.id) as orders_today,
        COALESCE(SUM(o.total_amount), 0) as revenue_today,
        COALESCE(SUM(pt.total_profit), 0) as profit_today,
        COUNT(DISTINCT o.customer_email) as customers_today
      FROM orders o
      LEFT JOIN profit_tracking pt ON o.id = pt.order_id
      WHERE DATE(o.created_at) = CURRENT_DATE
        AND o.status = 'completed'
    `

    // This week's stats
    const weekStats = await sql`
      SELECT 
        COUNT(DISTINCT o.id) as orders_week,
        COALESCE(SUM(o.total_amount), 0) as revenue_week,
        COALESCE(SUM(pt.total_profit), 0) as profit_week,
        COUNT(DISTINCT o.customer_email) as customers_week
      FROM orders o
      LEFT JOIN profit_tracking pt ON o.id = pt.order_id
      WHERE o.created_at >= ${startOfWeek.toISOString()}
        AND o.status = 'completed'
    `

    // This month's stats
    const monthStats = await sql`
      SELECT 
        COUNT(DISTINCT o.id) as orders_month,
        COALESCE(SUM(o.total_amount), 0) as revenue_month,
        COALESCE(SUM(pt.total_profit), 0) as profit_month,
        COUNT(DISTINCT o.customer_email) as customers_month,
        COALESCE(AVG(pt.profit_margin_percent), 0) as avg_margin_month
      FROM orders o
      LEFT JOIN profit_tracking pt ON o.id = pt.order_id
      WHERE o.created_at >= ${startOfMonth.toISOString()}
        AND o.status = 'completed'
    `

    // Low stock alerts
    const lowStockProducts = await sql`
      SELECT 
        id,
        name,
        brand,
        stock_quantity,
        min_stock_level,
        (min_stock_level - stock_quantity) as shortage
      FROM products
      WHERE stock_quantity <= min_stock_level
        AND is_active = true
      ORDER BY shortage DESC
      LIMIT 10
    `

    // Recent orders
    const recentOrders = await sql`
      SELECT 
        o.id,
        o.customer_name,
        o.total_amount,
        o.status,
        o.created_at,
        COUNT(oi.id) as items_count
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      GROUP BY o.id, o.customer_name, o.total_amount, o.status, o.created_at
      ORDER BY o.created_at DESC
      LIMIT 5
    `

    // Top products this month
    const topProducts = await sql`
      SELECT 
        p.name,
        p.brand,
        SUM(oi.quantity) as total_sold,
        SUM(oi.total_price) as revenue,
        SUM(pt.total_profit) as profit
      FROM orders o
      JOIN order_items oi ON o.id = oi.order_id
      LEFT JOIN products p ON oi.product_id = p.id
      LEFT JOIN profit_tracking pt ON o.id = pt.order_id AND oi.product_id = pt.product_id
      WHERE o.created_at >= ${startOfMonth.toISOString()}
        AND o.status = 'completed'
      GROUP BY p.id, p.name, p.brand
      ORDER BY total_sold DESC
      LIMIT 5
    `

    // Profit trend (last 7 days)
    const profitTrend = await sql`
      SELECT 
        DATE(o.created_at) as date,
        COALESCE(SUM(pt.total_profit), 0) as daily_profit,
        COALESCE(SUM(o.total_amount), 0) as daily_revenue,
        COUNT(DISTINCT o.id) as daily_orders
      FROM orders o
      LEFT JOIN profit_tracking pt ON o.id = pt.order_id
      WHERE o.created_at >= CURRENT_DATE - INTERVAL '7 days'
        AND o.status = 'completed'
      GROUP BY DATE(o.created_at)
      ORDER BY date DESC
    `

    return NextResponse.json({
      today: todayStats[0] || { orders_today: 0, revenue_today: 0, profit_today: 0, customers_today: 0 },
      week: weekStats[0] || { orders_week: 0, revenue_week: 0, profit_week: 0, customers_week: 0 },
      month: monthStats[0] || {
        orders_month: 0,
        revenue_month: 0,
        profit_month: 0,
        customers_month: 0,
        avg_margin_month: 0,
      },
      lowStockProducts,
      recentOrders,
      topProducts,
      profitTrend,
      generated_at: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Error fetching dashboard analytics:", error)
    return NextResponse.json({ error: "Failed to fetch dashboard analytics" }, { status: 500 })
  }
}
