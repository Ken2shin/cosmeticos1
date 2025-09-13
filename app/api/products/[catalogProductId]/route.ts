import { NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function GET(request: Request, { params }: { params: { catalogProductId: string } }) {
  try {
    const productId = Number.parseInt(params.catalogProductId)

    if (isNaN(productId) || productId <= 0) {
      return NextResponse.json({ error: "Invalid product ID" }, { status: 400 })
    }

    const product = await sql`
      SELECT 
        p.*,
        c.name as category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.id = ${productId} AND p.is_active = true
    `

    if (product.length === 0) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 })
    }

    return NextResponse.json(product[0])
  } catch (error) {
    console.error("Error fetching product:", error)
    return NextResponse.json({ error: "Failed to fetch product" }, { status: 500 })
  }
}

export async function PUT(request: Request, { params }: { params: { catalogProductId: string } }) {
  try {
    const productId = Number.parseInt(params.catalogProductId)
    const { stock_quantity } = await request.json()

    if (isNaN(productId) || productId <= 0) {
      return NextResponse.json({ error: "Invalid product ID" }, { status: 400 })
    }

    const result = await sql`
      UPDATE products 
      SET stock_quantity = ${stock_quantity}, updated_at = CURRENT_TIMESTAMP
      WHERE id = ${productId}
      RETURNING *
    `

    if (result.length === 0) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 })
    }

    return NextResponse.json(result[0])
  } catch (error) {
    console.error("Error updating product:", error)
    return NextResponse.json({ error: "Failed to update product" }, { status: 500 })
  }
}
