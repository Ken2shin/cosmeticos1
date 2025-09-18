import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function GET(request: NextRequest, { params }: { params: { adminProductId: string } }) {
  try {
    console.log("[v0] Fetching admin product:", params.adminProductId)

    const productId = Number.parseInt(params.adminProductId)
    if (isNaN(productId)) {
      return NextResponse.json({ error: "Invalid product ID" }, { status: 400 })
    }

    const products = await sql`
      SELECT * FROM products WHERE id = ${productId}
    `

    if (products.length === 0) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 })
    }

    console.log("[v0] Admin product fetched successfully")
    return NextResponse.json(products[0])
  } catch (error) {
    console.error("[v0] Error fetching admin product:", error)
    return NextResponse.json({ error: "Failed to fetch product" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: { adminProductId: string } }) {
  try {
    console.log("[v0] Updating admin product:", params.adminProductId)

    const productId = Number.parseInt(params.adminProductId)
    if (isNaN(productId)) {
      return NextResponse.json({ error: "Invalid product ID" }, { status: 400 })
    }

    const body = await request.json()
    const { name, description, price, category, image_url, sku, stock_quantity, is_active } = body

    // Validate required fields
    if (!name || !price) {
      return NextResponse.json({ error: "Name and price are required" }, { status: 400 })
    }

    // Validate price range
    if (price > 99999999.99) {
      return NextResponse.json(
        {
          error: "Price cannot exceed $99,999,999.99",
        },
        { status: 400 },
      )
    }

    const updatedProducts = await sql`
      UPDATE products 
      SET 
        name = ${name},
        description = ${description || ""},
        price = ${price},
        category = ${category || ""},
        image_url = ${image_url || ""},
        sku = ${sku || ""},
        stock_quantity = ${stock_quantity || 0},
        is_active = ${is_active !== false},
        updated_at = NOW()
      WHERE id = ${productId}
      RETURNING *
    `

    if (updatedProducts.length === 0) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 })
    }

    const updatedProduct = updatedProducts[0]
    console.log("[v0] Admin product updated successfully")

    return NextResponse.json(updatedProduct)
  } catch (error) {
    console.error("[v0] Error updating admin product:", error)
    return NextResponse.json({ error: "Failed to update product" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { adminProductId: string } }) {
  try {
    console.log("[v0] Deleting admin product:", params.adminProductId)

    const productId = Number.parseInt(params.adminProductId)
    if (isNaN(productId)) {
      return NextResponse.json({ error: "Invalid product ID" }, { status: 400 })
    }

    const existingProducts = await sql`
      SELECT id FROM products WHERE id = ${productId}
    `

    if (existingProducts.length === 0) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 })
    }

    const deleteResult = await sql`
      DELETE FROM products WHERE id = ${productId}
    `

    console.log("[v0] Admin product deleted successfully:", deleteResult)

    return NextResponse.json({ message: "Product deleted successfully", productId })
  } catch (error) {
    console.error("[v0] Error deleting admin product:", error)
    return NextResponse.json(
      {
        error: "Failed to delete product",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
