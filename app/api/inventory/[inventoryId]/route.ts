import { NextResponse } from "next/server"
import { sql } from "@/lib/db"

export const dynamic = "force-dynamic"

export async function GET(request: Request, { params }: { params: { inventoryId: string } }) {
  try {
    const inventoryId = Number.parseInt(params.inventoryId)

    if (isNaN(inventoryId) || inventoryId <= 0) {
      return NextResponse.json({ error: "Invalid inventory ID" }, { status: 400 })
    }

    const inventory = await sql`
      SELECT 
        i.*,
        p.name as product_name,
        p.brand as product_brand,
        p.price as selling_price,
        p.stock_quantity as current_stock,
        p.cost_price,
        (p.price - p.cost_price) as profit_per_unit,
        ((p.price - p.cost_price) / p.price * 100) as profit_margin_percent
      FROM inventory i
      JOIN products p ON i.product_id = p.id
      WHERE i.id = ${inventoryId}
    `

    if (inventory.length === 0) {
      return NextResponse.json({ error: "Inventory record not found" }, { status: 404 })
    }

    return NextResponse.json(inventory[0])
  } catch (error) {
    console.error("Error fetching inventory record:", error)
    return NextResponse.json({ error: "Failed to fetch inventory record" }, { status: 500 })
  }
}

export async function PUT(request: Request, { params }: { params: { inventoryId: string } }) {
  try {
    const inventoryId = Number.parseInt(params.inventoryId)
    const { purchase_price, purchase_quantity, supplier_name, supplier_contact, notes, update_product_stock } =
      await request.json()

    if (isNaN(inventoryId) || inventoryId <= 0) {
      return NextResponse.json({ error: "Invalid inventory ID" }, { status: 400 })
    }

    const currentInventory = await sql`
      SELECT product_id, purchase_price, purchase_quantity FROM inventory WHERE id = ${inventoryId}
    `

    if (currentInventory.length === 0) {
      return NextResponse.json({ error: "Inventory record not found" }, { status: 404 })
    }

    const productId = currentInventory[0].product_id

    const result = await sql`
      UPDATE inventory 
      SET 
        purchase_price = ${purchase_price},
        purchase_quantity = ${purchase_quantity},
        supplier_name = ${supplier_name || null},
        supplier_contact = ${supplier_contact || null},
        notes = ${notes || null},
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ${inventoryId}
      RETURNING *
    `

    if (
      update_product_stock !== false &&
      (purchase_price !== currentInventory[0].purchase_price ||
        purchase_quantity !== currentInventory[0].purchase_quantity)
    ) {
      await sql`
        UPDATE products 
        SET 
          cost_price = ${purchase_price},
          stock_quantity = ${purchase_quantity},
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ${productId}
      `

      try {
        const { notifyStockUpdated, notifyInventoryChanged } = await import("@/lib/sse-notifications")
        notifyStockUpdated(productId.toString(), purchase_quantity)
        notifyInventoryChanged({
          ...result[0],
          action: "updated",
        })
        console.log("[v0] Real-time SSE notifications sent for inventory update")
      } catch (sseError) {
        console.error("[v0] SSE notification failed:", sseError)
        // Don't fail the request if SSE fails
      }
    }

    return NextResponse.json(result[0])
  } catch (error) {
    console.error("Error updating inventory record:", error)
    return NextResponse.json({ error: "Failed to update inventory record" }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: { inventoryId: string } }) {
  try {
    const inventoryId = Number.parseInt(params.inventoryId)

    if (isNaN(inventoryId) || inventoryId <= 0) {
      return NextResponse.json({ error: "Invalid inventory ID" }, { status: 400 })
    }

    const result = await sql`
      DELETE FROM inventory WHERE id = ${inventoryId}
      RETURNING *
    `

    if (result.length === 0) {
      return NextResponse.json({ error: "Inventory record not found" }, { status: 404 })
    }

    return NextResponse.json({ message: "Inventory record deleted successfully" })
  } catch (error) {
    console.error("Error deleting inventory record:", error)
    return NextResponse.json({ error: "Failed to delete inventory record" }, { status: 500 })
  }
}
