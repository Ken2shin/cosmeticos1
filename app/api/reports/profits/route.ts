import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")

    if (!startDate || !endDate) {
      return NextResponse.json({ error: "Start date and end date are required" }, { status: 400 })
    }

    console.log("[v0] Reports API: Generating REAL-TIME report for dates:", startDate, "to", endDate)

    const orders = await sql`
      SELECT 
        o.id,
        o.customer_name,
        o.customer_email,
        o.total_amount,
        o.status,
        o.created_at,
        oi.product_id,
        oi.quantity,
        oi.unit_price,
        oi.total_price,
        p.name as product_name,
        p.brand as product_brand,
        COALESCE(p.cost_price, p.price * 0.6) as cost_price,
        (oi.unit_price - COALESCE(p.cost_price, p.price * 0.6)) * oi.quantity as real_profit_amount,
        CASE 
          WHEN oi.unit_price > 0 THEN ((oi.unit_price - COALESCE(p.cost_price, p.price * 0.6)) / oi.unit_price * 100)
          ELSE 0
        END as real_profit_margin,
        COALESCE(p.cost_price, p.price * 0.6) * oi.quantity as item_cost
      FROM orders o
      JOIN order_items oi ON o.id = oi.order_id
      LEFT JOIN products p ON oi.product_id = p.id
      WHERE o.created_at >= ${startDate}::date 
        AND o.created_at <= ${endDate}::date + INTERVAL '1 day'
      ORDER BY o.created_at DESC
    `

    console.log("[v0] Reports API: Found", orders.length, "order items (all statuses)")

    const summaryResult = await sql`
      SELECT 
        COUNT(DISTINCT o.id) as total_orders,
        COUNT(DISTINCT CASE WHEN o.status = 'completed' THEN o.id END) as completed_orders,
        COUNT(DISTINCT CASE WHEN o.status = 'pending' THEN o.id END) as pending_orders,
        COUNT(DISTINCT CASE WHEN o.status = 'cancelled' THEN o.id END) as cancelled_orders,
        COALESCE(SUM(o.total_amount), 0) as total_revenue,
        COALESCE(SUM(CASE WHEN o.status = 'completed' THEN o.total_amount ELSE 0 END), 0) as completed_revenue,
        COALESCE(SUM((oi.unit_price - COALESCE(p.cost_price, p.price * 0.6)) * oi.quantity), 0) as total_profit,
        COALESCE(SUM(COALESCE(p.cost_price, p.price * 0.6) * oi.quantity), 0) as total_costs,
        CASE 
          WHEN SUM(oi.total_price) > 0 
          THEN (SUM((oi.unit_price - COALESCE(p.cost_price, p.price * 0.6)) * oi.quantity) / SUM(oi.total_price) * 100)
          ELSE 0
        END as avg_profit_margin,
        COALESCE(AVG(o.total_amount), 0) as avg_order_value
      FROM orders o
      JOIN order_items oi ON o.id = oi.order_id
      LEFT JOIN products p ON oi.product_id = p.id
      WHERE o.created_at >= ${startDate}::date 
        AND o.created_at <= ${endDate}::date + INTERVAL '1 day'
    `

    const summary = summaryResult[0] || {
      total_orders: 0,
      completed_orders: 0,
      pending_orders: 0,
      cancelled_orders: 0,
      total_revenue: 0,
      completed_revenue: 0,
      total_profit: 0,
      total_costs: 0,
      avg_profit_margin: 0,
      avg_order_value: 0,
    }

    console.log("[v0] Reports API: REAL-TIME Summary calculated:", summary)

    const topProducts = await sql`
      SELECT 
        COALESCE(p.name, 'Producto sin nombre') as product_name,
        COALESCE(p.brand, 'Sin marca') as product_brand,
        SUM(oi.quantity) as total_sold,
        SUM(oi.total_price) as total_revenue,
        SUM(COALESCE(p.cost_price, p.price * 0.6) * oi.quantity) as total_costs,
        SUM((oi.unit_price - COALESCE(p.cost_price, p.price * 0.6)) * oi.quantity) as total_profit,
        CASE 
          WHEN SUM(oi.total_price) > 0 
          THEN (SUM((oi.unit_price - COALESCE(p.cost_price, p.price * 0.6)) * oi.quantity) / SUM(oi.total_price) * 100)
          ELSE 0
        END as avg_profit_margin,
        COUNT(DISTINCT o.id) as orders_count
      FROM orders o
      JOIN order_items oi ON o.id = oi.order_id
      LEFT JOIN products p ON oi.product_id = p.id
      WHERE o.created_at >= ${startDate}::date 
        AND o.created_at <= ${endDate}::date + INTERVAL '1 day'
        AND p.name IS NOT NULL
      GROUP BY p.name, p.brand, p.id
      ORDER BY total_sold DESC
      LIMIT 10
    `

    console.log("[v0] Reports API: Top products found:", topProducts.length)

    const dailyBreakdown = await sql`
      SELECT 
        DATE(o.created_at) as date,
        COUNT(DISTINCT o.id) as orders_count,
        COUNT(DISTINCT CASE WHEN o.status = 'completed' THEN o.id END) as completed_orders,
        COUNT(DISTINCT CASE WHEN o.status = 'pending' THEN o.id END) as pending_orders,
        SUM(o.total_amount) as daily_revenue,
        SUM(CASE WHEN o.status = 'completed' THEN o.total_amount ELSE 0 END) as completed_revenue,
        SUM((oi.unit_price - COALESCE(p.cost_price, p.price * 0.6)) * oi.quantity) as daily_profit,
        SUM(COALESCE(p.cost_price, p.price * 0.6) * oi.quantity) as daily_costs
      FROM orders o
      JOIN order_items oi ON o.id = oi.order_id
      LEFT JOIN products p ON oi.product_id = p.id
      WHERE o.created_at >= ${startDate}::date 
        AND o.created_at <= ${endDate}::date + INTERVAL '1 day'
      GROUP BY DATE(o.created_at)
      ORDER BY date DESC
    `

    const customerAnalysis = await sql`
      SELECT 
        COUNT(DISTINCT o.customer_email) as unique_customers,
        COUNT(DISTINCT CASE WHEN customer_order_count = 1 THEN o.customer_email END) as new_customers,
        COUNT(DISTINCT CASE WHEN customer_order_count > 1 THEN o.customer_email END) as returning_customers,
        AVG(customer_total_spent) as avg_customer_value
      FROM (
        SELECT 
          o.customer_email,
          COUNT(*) as customer_order_count,
          SUM(o.total_amount) as customer_total_spent
        FROM orders o
        WHERE o.created_at >= ${startDate}::date 
          AND o.created_at <= ${endDate}::date + INTERVAL '1 day'
        GROUP BY o.customer_email
      ) customer_stats
      JOIN orders o ON o.customer_email = customer_stats.customer_email
      WHERE o.created_at >= ${startDate}::date 
        AND o.created_at <= ${endDate}::date + INTERVAL '1 day'
    `

    return NextResponse.json({
      orders,
      summary,
      topProducts,
      dailyBreakdown,
      customerAnalysis: customerAnalysis[0] || {
        unique_customers: 0,
        new_customers: 0,
        returning_customers: 0,
        avg_customer_value: 0,
      },
      dateRange: { startDate, endDate },
      metadata: {
        calculatedAt: new Date().toISOString(),
        isRealTime: true,
        totalOrderItems: orders.length,
        dataSource: "live_database",
        costCalculationMethod: "actual_cost_price_or_60_percent_fallback",
      },
    })
  } catch (error) {
    console.error("[v0] Reports API: Error generating REAL-TIME profit report:", error)
    return NextResponse.json(
      {
        error: "Failed to generate profit report: " + (error instanceof Error ? error.message : "Unknown error"),
        summary: {
          total_orders: 0,
          completed_orders: 0,
          pending_orders: 0,
          cancelled_orders: 0,
          total_revenue: 0,
          completed_revenue: 0,
          total_profit: 0,
          total_costs: 0,
          avg_profit_margin: 0,
          avg_order_value: 0,
        },
        topProducts: [],
        dailyBreakdown: [],
        customerAnalysis: {
          unique_customers: 0,
          new_customers: 0,
          returning_customers: 0,
          avg_customer_value: 0,
        },
        orders: [],
      },
      { status: 500 },
    )
  }
}
