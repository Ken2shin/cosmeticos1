import { NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const customerEmail = searchParams.get("customer_email")

    let orders
    if (customerEmail) {
      orders = await sql`
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
        WHERE o.customer_email = ${customerEmail}
        GROUP BY o.id
        ORDER BY o.created_at DESC
      `
    } else {
      orders = await sql`
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
        GROUP BY o.id
        ORDER BY o.created_at DESC
      `
    }

    return NextResponse.json(orders)
  } catch (error) {
    console.error("Error fetching orders:", error)
    return NextResponse.json({ error: "Failed to fetch orders" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    console.log("[v0] Orders API: Starting request processing")

    const body = await request.json()
    console.log("[v0] Orders API: Received body:", JSON.stringify(body, null, 2))

    const { customer_name, customer_email, customer_phone, items, total, status = "pending" } = body

    if (items && Array.isArray(items) && items.length > 0) {
      console.log("[v0] Orders API: Validating stock for items")

      for (const item of items) {
        const product = await sql`
          SELECT stock_quantity, name, price, is_active
          FROM products 
          WHERE id = ${item.id || item.product_id}
        `

        if (product.length === 0) {
          return NextResponse.json(
            {
              error: `Producto no encontrado: ${item.name || item.id}`,
              code: "PRODUCT_NOT_FOUND",
            },
            { status: 400 },
          )
        }

        if (!product[0].is_active) {
          return NextResponse.json(
            {
              error: `Producto no disponible: ${product[0].name}`,
              code: "PRODUCT_INACTIVE",
            },
            { status: 400 },
          )
        }

        const currentStock = Number(product[0].stock_quantity) || 0
        const requestedQuantity = Number(item.quantity) || 1

        if (currentStock < requestedQuantity) {
          return NextResponse.json(
            {
              error: `Stock insuficiente para ${product[0].name}. Disponible: ${currentStock}, Solicitado: ${requestedQuantity}`,
              code: "INSUFFICIENT_STOCK",
              product_name: product[0].name,
              available_stock: currentStock,
              requested_quantity: requestedQuantity,
            },
            { status: 400 },
          )
        }
      }
    }

    let processedItems = []
    if (items && Array.isArray(items) && items.length > 0) {
      processedItems = items
    } else {
      console.log("[v0] Orders API: No items provided, creating default consultation item")
      processedItems = [
        {
          product_id: 1,
          quantity: 1,
          price: total || 50,
          name: "Consulta de productos",
        },
      ]
    }

    const total_amount = processedItems.reduce((sum: number, item: any) => {
      const price = item.price || item.unit_price || 50
      const quantity = item.quantity || 1
      return sum + price * quantity
    }, 0)

    console.log("[v0] Orders API: Calculated total:", total_amount)

    const orderResult = await sql`
      INSERT INTO orders (customer_name, customer_email, customer_phone, total_amount, status)
      VALUES (
        ${customer_name || "Cliente"}, 
        ${customer_email || "no-email@example.com"}, 
        ${customer_phone || "Sin teléfono"}, 
        ${total_amount}, 
        ${status}
      )
      RETURNING *
    `

    const order = orderResult[0]
    console.log("[v0] Orders API: Order created:", order.id, "with total:", order.total_amount)

    for (const item of processedItems) {
      try {
        const product_id = item.product_id || item.id || 1
        const quantity = Number(item.quantity) || 1

        // Get product price and current stock if not provided
        const productInfo = await sql`
          SELECT price, name, stock_quantity FROM products WHERE id = ${product_id}
        `

        const unit_price = Number(item.price || item.unit_price || productInfo[0]?.price || 50)
        const total_price = unit_price * quantity

        console.log("[v0] Creating order item:", { product_id, quantity, unit_price, total_price })

        // Create order item
        await sql`
          INSERT INTO order_items (
            order_id, 
            product_id, 
            quantity, 
            unit_price, 
            total_price
          )
          VALUES (
            ${order.id}, 
            ${product_id}, 
            ${quantity}, 
            ${unit_price}, 
            ${total_price}
          )
        `

        const stockUpdateResult = await sql`
          UPDATE products 
          SET stock_quantity = GREATEST(0, stock_quantity - ${quantity})
          WHERE id = ${product_id}
          RETURNING stock_quantity, name
        `

        if (stockUpdateResult.length > 0) {
          const newStock = stockUpdateResult[0].stock_quantity
          const productName = stockUpdateResult[0].name
          console.log(
            "[v0] Orders API: Stock updated for",
            productName,
            "- New stock:",
            newStock,
            "- Reduced by:",
            quantity,
          )
        } else {
          console.warn("[v0] Orders API: No product found for stock update:", product_id)
        }
      } catch (itemError) {
        console.error("[v0] Orders API: Error processing item:", itemError)
        const errorMessage =
          typeof itemError === "object" && itemError !== null && "message" in itemError
            ? (itemError as { message?: string }).message
            : String(itemError);
        throw new Error(`Error processing item ${item.product_id || item.id}: ${errorMessage}`)
      }
    }

    console.log("[v0] Orders API: Order completed successfully with stock management")

    try {
      // Check if customer already exists
      const existingCustomer = await sql`
        SELECT id, total_orders, total_spent FROM customers 
        WHERE email = ${customer_email || "no-email@example.com"}
      `

      if (existingCustomer.length > 0) {
        // Update existing customer
        await sql`
          UPDATE customers SET 
            total_orders = total_orders + 1,
            total_spent = total_spent + ${total_amount},
            last_purchase_date = CURRENT_TIMESTAMP,
            phone = COALESCE(${customer_phone}, phone),
            name = COALESCE(${customer_name}, name)
          WHERE email = ${customer_email || "no-email@example.com"}
        `
        console.log("[v0] Orders API: Updated existing customer")
      } else {
        // Create new customer
        await sql`
          INSERT INTO customers (name, email, phone, total_orders, total_spent, first_purchase_date, last_purchase_date)
          VALUES (
            ${customer_name || "Cliente"}, 
            ${customer_email || "no-email@example.com"}, 
            ${customer_phone || null}, 
            1, 
            ${total_amount}, 
            CURRENT_TIMESTAMP, 
            CURRENT_TIMESTAMP
          )
        `
        console.log("[v0] Orders API: Created new customer")
      }
    } catch (customerError) {
      console.error("[v0] Orders API: Error managing customer record:", customerError)
    }

    return NextResponse.json({
      ...order,
      message: "¡Pedido enviado exitosamente! El stock ha sido actualizado.",
    })
  } catch (error) {
    console.error("[v0] Orders API: Error:", error)
    const errorMessage =
      typeof error === "object" && error !== null && "message" in error
        ? (error as { message?: string }).message
        : String(error);
    return NextResponse.json({ error: "Error al procesar el pedido: " + errorMessage }, { status: 500 })
  }
}
