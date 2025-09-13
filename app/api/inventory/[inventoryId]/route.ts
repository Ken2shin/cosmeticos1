import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const inventoryId = Number.parseInt(params.id)

    const inventory = await sql`
      SELECT 
        i.*,
        p.name as product_name,
        p.brand as product_brand,
        p.price as selling_price,
        p.stock_quantity as current_stock
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

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const inventoryId = Number.parseInt(params.id)
    const { purchase_price, purchase_quantity, current_stock, supplier_name, supplier_contact, notes } =
      await request.json()

    const inventoryRecord = await sql`
      SELECT product_id FROM inventory WHERE id = ${inventoryId}
    `

    if (inventoryRecord.length === 0) {
      return NextResponse.json({ error: "Inventory record not found" }, { status: 404 })
    }

    const productId = inventoryRecord[0].product_id

    const inventory = await sql`
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

    if (current_stock !== undefined) {
      await sql`
        UPDATE products 
        SET 
          stock_quantity = ${current_stock},
          cost_price = ${purchase_price},
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ${productId}
      `
    }

    return NextResponse.json(inventory[0])
  } catch (error) {
    console.error("Error updating inventory record:", error)
    return NextResponse.json({ error: "Failed to update inventory record" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const inventoryId = Number.parseInt(params.id)

    await sql`
      DELETE FROM inventory WHERE id = ${inventoryId}
    `

    return NextResponse.json({ message: "Inventory record deleted successfully" })
  } catch (error) {
    console.error("Error deleting inventory record:", error)
    return NextResponse.json({ error: "Failed to delete inventory record" }, { status: 500 })
  }
}
