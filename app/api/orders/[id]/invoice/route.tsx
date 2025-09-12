import { NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const orderId = Number.parseInt(params.id)

    if (isNaN(orderId)) {
      return NextResponse.json({ error: "Invalid order ID" }, { status: 400 })
    }

    const orderResult = await sql`
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

    if (orderResult.length === 0) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 })
    }

    const order = orderResult[0]

    const invoiceHTML = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>Factura #${order.id}</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
            .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #e91e63; padding-bottom: 20px; }
            .company-name { font-size: 28px; font-weight: bold; color: #e91e63; margin-bottom: 5px; }
            .invoice-title { font-size: 24px; margin: 20px 0; }
            .info-section { display: flex; justify-content: space-between; margin: 20px 0; }
            .info-box { width: 45%; }
            .info-box h3 { color: #e91e63; border-bottom: 1px solid #eee; padding-bottom: 5px; }
            .items-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            .items-table th, .items-table td { border: 1px solid #ddd; padding: 12px; text-align: left; }
            .items-table th { background-color: #f8f9fa; font-weight: bold; }
            .total-section { text-align: right; margin-top: 20px; }
            .total-amount { font-size: 24px; font-weight: bold; color: #e91e63; }
            .footer { margin-top: 40px; text-align: center; color: #666; font-size: 12px; }
        </style>
    </head>
    <body>
        <div class="header">
            <div class="company-name">Beauty Catalog</div>
            <div>Catálogo de Productos de Belleza</div>
        </div>

        <div class="invoice-title">FACTURA #${order.id}</div>

        <div class="info-section">
            <div class="info-box">
                <h3>Información del Cliente</h3>
                <p><strong>Nombre:</strong> ${order.customer_name}</p>
                <p><strong>Email:</strong> ${order.customer_email}</p>
                ${order.customer_phone ? `<p><strong>Teléfono:</strong> ${order.customer_phone}</p>` : ""}
            </div>
            <div class="info-box">
                <h3>Información del Pedido</h3>
                <p><strong>Fecha:</strong> ${new Date(order.created_at).toLocaleDateString("es-ES")}</p>
                <p><strong>Estado:</strong> ${order.status === "pending" ? "Pendiente" : order.status === "completed" ? "Completado" : "Cancelado"}</p>
            </div>
        </div>

        <table class="items-table">
            <thead>
                <tr>
                    <th>Producto</th>
                    <th>Marca</th>
                    <th>Cantidad</th>
                    <th>Precio Unitario</th>
                    <th>Total</th>
                </tr>
            </thead>
            <tbody>
                ${order.items
                  .filter((item) => item.product_name)
                  .map(
                    (item) => `
                    <tr>
                        <td>${item.product_name}</td>
                        <td>${item.product_brand || "-"}</td>
                        <td>${item.quantity}</td>
                        <td>C$${Number(item.unit_price).toFixed(2)}</td>
                        <td>C$${Number(item.total_price).toFixed(2)}</td>
                    </tr>
                `,
                  )
                  .join("")}
            </tbody>
        </table>

        <div class="total-section">
            <div class="total-amount">TOTAL: C$${Number(order.total_amount).toFixed(2)}</div>
        </div>

        <div class="footer">
            <p>Gracias por su compra en Beauty Catalog</p>
            <p>Factura generada el ${new Date().toLocaleDateString("es-ES")}</p>
        </div>
    </body>
    </html>
    `

    return new Response(invoiceHTML, {
      headers: {
        "Content-Type": "text/html",
        "Content-Disposition": `inline; filename="factura-${order.id}.html"`,
      },
    })
  } catch (error) {
    console.error("Error generating invoice:", error)
    return NextResponse.json({ error: "Failed to generate invoice" }, { status: 500 })
  }
}
