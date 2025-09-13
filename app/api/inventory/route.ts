import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function GET() {
  try {
    console.log("[v0] API: Fetching inventory records")

    const inventory = await sql`
      SELECT 
        i.*,
        p.name as product_name,
        p.brand as product_brand,
        p.price as selling_price,
        p.stock_quantity as current_stock,
        p.cost_price,
        (p.price - COALESCE(p.cost_price, 0)) as profit_per_unit,
        (CASE 
          WHEN p.price > 0 THEN ((p.price - COALESCE(p.cost_price, 0)) / p.price * 100)
          ELSE 0 
        END) as profit_margin_percent
      FROM inventory i
      JOIN products p ON i.product_id = p.id
      ORDER BY i.purchase_date DESC
    `

    console.log("[v0] API: Inventory records fetched:", inventory.length)
    return NextResponse.json(inventory)
  } catch (error) {
    console.error("[v0] API: Error fetching inventory:", error)
    return NextResponse.json({ error: "Failed to fetch inventory" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const requestBody = await request.json()
    const { product_id, purchase_price, purchase_quantity, current_stock, supplier_name, supplier_contact, notes } =
      requestBody

    console.log("[v0] API: Creating inventory record:", { product_id, purchase_price, purchase_quantity })

    if (!product_id || !purchase_price || !purchase_quantity) {
      return NextResponse.json(
        {
          error: "Product ID, purchase price, and quantity are required",
        },
        { status: 400 },
      )
    }

    const productExists = await sql`
      SELECT id, name FROM products WHERE id = ${product_id} AND is_active = true
    `

    if (productExists.length === 0) {
      return NextResponse.json(
        {
          error: "Product not found or inactive",
          details: `Product with ID ${product_id} does not exist or is inactive`,
        },
        { status: 400 },
      )
    }

    const inventoryRecord = await sql`
      INSERT INTO inventory (
        product_id, 
        purchase_price, 
        purchase_quantity, 
        supplier_name, 
        supplier_contact, 
        notes
      )
      VALUES (
        ${product_id}, 
        ${purchase_price}, 
        ${purchase_quantity}, 
        ${supplier_name || null}, 
        ${supplier_contact || null}, 
        ${notes || null}
      )
      RETURNING *
    `

    const stockUpdate = current_stock !== undefined ? current_stock : purchase_quantity
    await sql`
      UPDATE products 
      SET 
        cost_price = ${purchase_price},
        stock_quantity = ${stockUpdate},
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ${product_id}
    `

    try {
      const { notifyStockUpdated, notifyInventoryChanged } = require("@/lib/websocket-server.js")
      notifyStockUpdated(product_id, stockUpdate)
      notifyInventoryChanged({
        ...inventoryRecord[0],
        product_name: productExists[0].name,
        action: "created",
      })
      console.log("[v0] Real-time notifications sent for inventory update")
    } catch (wsError) {
      console.error("[v0] WebSocket notification failed:", wsError)
      // Don't fail the request if WebSocket fails
    }

    return NextResponse.json(inventoryRecord[0], { status: 201 })
  } catch (error) {
    console.error("[v0] API: Error creating inventory record:", error)

    const errorMessage = error instanceof Error ? error.message : String(error)

    if (errorMessage.includes("foreign key constraint")) {
      return NextResponse.json(
        {
          error: "Product reference error",
          details: "The specified product does not exist in the database",
        },
        { status: 400 },
      )
    }

    return NextResponse.json({ error: "Failed to create inventory record" }, { status: 500 })
  }
}
