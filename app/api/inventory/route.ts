import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function GET() {
  try {
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
      ORDER BY i.purchase_date DESC
    `

    return NextResponse.json(inventory)
  } catch (error) {
    console.error("Error fetching inventory:", error)
    return NextResponse.json({ error: "Failed to fetch inventory" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { product_id, purchase_price, purchase_quantity, current_stock, supplier_name, supplier_contact, notes } =
      await request.json()

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

    // Insert inventory record
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

    return NextResponse.json(inventoryRecord[0], { status: 201 })
  } catch (error) {
    console.error("Error creating inventory record:", error)

    if (
      typeof error === "object" &&
      error !== null &&
      "message" in error &&
      typeof (error as { message: unknown }).message === "string" &&
      (error as { message: string }).message.includes("foreign key constraint")
    ) {
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
