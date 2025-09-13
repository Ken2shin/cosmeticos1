import { NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function GET(request: Request, { params }: { params: { orderId: string } }) {
  try {
    const orderId = Number.parseInt(params.orderId)

    if (isNaN(orderId) || orderId <= 0) {
      return NextResponse.json({ error: "Invalid order ID" }, { status: 400 })
    }

    const order = await sql`
      SELECT o.*, 
             json_agg(
               json_build_object(
                 'product_id', oi.product_id,
                 'quantity', oi.quantity,
                 'unit_price', oi.unit_price,
                 'total_price', oi.total_price,
                 'product_name', p.name
               )
             ) as items
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      LEFT JOIN products p ON oi.product_id = p.id
      WHERE o.id = ${orderId}
      GROUP BY o.id
    `

    if (order.length === 0) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 })
    }

    return NextResponse.json(order[0])
  } catch (error) {
    console.error("Error fetching order:", error)
    return NextResponse.json({ error: "Failed to fetch order" }, { status: 500 })
  }
}

export async function PUT(request: Request, { params }: { params: { orderId: string } }) {
  try {
    const orderId = Number.parseInt(params.orderId)
    const { status, customer_name, customer_email, customer_phone } = await request.json()

    if (isNaN(orderId) || orderId <= 0) {
      return NextResponse.json({ error: "Invalid order ID" }, { status: 400 })
    }

    const result = await sql`
      UPDATE orders 
      SET 
        status = ${status || "pending"},
        customer_name = ${customer_name},
        customer_email = ${customer_email},
        customer_phone = ${customer_phone || null},
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ${orderId}
      RETURNING *
    `

    if (result.length === 0) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 })
    }

    return NextResponse.json(result[0])
  } catch (error) {
    console.error("Error updating order:", error)
    return NextResponse.json({ error: "Failed to update order" }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: { orderId: string } }) {
  try {
    const orderId = Number.parseInt(params.orderId)

    if (isNaN(orderId) || orderId <= 0) {
      return NextResponse.json({ error: "Invalid order ID" }, { status: 400 })
    }

    // First delete order items
    await sql`DELETE FROM order_items WHERE order_id = ${orderId}`

    // Then delete the order
    const result = await sql`
      DELETE FROM orders WHERE id = ${orderId}
      RETURNING *
    `

    if (result.length === 0) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 })
    }

    return NextResponse.json({ message: "Order deleted successfully" })
  } catch (error) {
    console.error("Error deleting order:", error)
    return NextResponse.json({ error: "Failed to delete order" }, { status: 500 })
  }
}
