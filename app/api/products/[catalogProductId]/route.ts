import { NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const body = await request.json()
    const { name, description, price, category, brand, image_url, stock_quantity, is_active } = body
    const id = Number.parseInt(params.id)

    const result = await sql`
      UPDATE products 
      SET name = ${name}, description = ${description}, price = ${price}, 
          category = ${category}, brand = ${brand}, image_url = ${image_url},
          stock_quantity = ${stock_quantity}, is_active = ${is_active},
          updated_at = NOW()
      WHERE id = ${id}
      RETURNING *
    `

    return NextResponse.json(result[0])
  } catch (error) {
    console.error("Error updating product:", error)
    return NextResponse.json({ error: "Failed to update product" }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const id = Number.parseInt(params.id)

    const existingProduct = await sql`SELECT id FROM products WHERE id = ${id}`

    if (existingProduct.length === 0) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 })
    }

    await sql`DELETE FROM order_items WHERE product_id = ${id}`

    const result = await sql`DELETE FROM products WHERE id = ${id} RETURNING id`

    if (result.length === 0) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true, message: "Product deleted successfully" })
  } catch (error) {
    console.error("Error deleting product:", error)
    if (error instanceof Error && error.message.includes("foreign key")) {
      return NextResponse.json(
        {
          error: "Cannot delete product because it is referenced in orders",
        },
        { status: 400 },
      )
    }
    return NextResponse.json({ error: "Failed to delete product" }, { status: 500 })
  }
}
