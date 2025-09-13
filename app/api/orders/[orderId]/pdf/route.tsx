import { NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const orderId = Number.parseInt(params.id)

    if (isNaN(orderId) || orderId <= 0) {
      return NextResponse.json({ error: "ID de pedido inválido" }, { status: 400 })
    }

    let orderResult
    try {
      orderResult = await sql`
        SELECT o.*, 
               json_agg(
                 json_build_object(
                   'id', oi.id,
                   'product_id', oi.product_id,
                   'quantity', oi.quantity,
                   'unit_price', oi.unit_price,
                   'total_price', oi.total_price,
                   'product_name', COALESCE(p.name, 'Producto'),
                   'product_brand', p.brand
                 ) ORDER BY oi.id
               ) as items
        FROM orders o
        LEFT JOIN order_items oi ON o.id = oi.order_id
        LEFT JOIN products p ON oi.product_id = p.id
        WHERE o.id = ${orderId}
        GROUP BY o.id
      `
    } catch (dbError) {
      console.error("Database error fetching order for PDF:", dbError)
      return NextResponse.json(
        {
          error: "Error de base de datos al obtener información del pedido",
        },
        { status: 500 },
      )
    }

    if (orderResult.length === 0) {
      return NextResponse.json({ error: "Pedido no encontrado" }, { status: 404 })
    }

    const order = orderResult[0]

    if (!order.customer_name || !order.customer_email) {
      return NextResponse.json(
        {
          error: "Datos del pedido incompletos para generar PDF",
        },
        { status: 400 },
      )
    }

    // Return order data for client-side PDF generation
    return NextResponse.json({
      order: {
        id: order.id,
        customer_name: order.customer_name,
        customer_email: order.customer_email,
        customer_phone: order.customer_phone,
        total_amount: order.total_amount,
        status: order.status,
        created_at: order.created_at,
        items: order.items.filter((item: any) => item.product_name && item.product_name !== "null"),
      },
    })
  } catch (error) {
    console.error("Error fetching order for PDF:", error)

    let errorMessage = "Error interno del servidor al obtener datos para PDF"

    if (error.message.includes("connection")) {
      errorMessage = "Error de conexión a la base de datos"
    } else if (error.message.includes("timeout")) {
      errorMessage = "Tiempo de espera agotado al obtener datos del pedido"
    }

    return NextResponse.json(
      {
        error: errorMessage,
        details: process.env.NODE_ENV === "development" ? error.message : undefined,
      },
      { status: 500 },
    )
  }
}
