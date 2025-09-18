import { NextResponse } from "next/server"
import { sql } from "@/lib/db"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    console.log("[v0] API: Fetching products with stock data")

    const products = await sql`
      SELECT 
        id,
        name,
        description,
        price,
        stock_quantity,
        brand,
        category,
        image_url,
        is_active,
        created_at,
        updated_at
      FROM products 
      WHERE is_active = true
      ORDER BY created_at DESC
    ` as Array<{
      id: number
      name: string
      description: string | null
      price: number
      stock_quantity: number | string
      brand: string | null
      category: string | null
      image_url: string | null
      is_active: boolean
      created_at: string
      updated_at: string
    }>

    const validatedProducts = products.map((product) => ({
      ...product,
      stock_quantity: Math.max(0, Number.parseInt(product.stock_quantity as string) || 0), // Force non-negative integers
    }))

    console.log(
      "[v0] API: Products with stock:",
      validatedProducts.map((p) => ({
        name: p.name,
        stock: p.stock_quantity,
        active: p.is_active,
      })),
    )

    return NextResponse.json(validatedProducts, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
        Pragma: "no-cache",
        Expires: "0",
        "Last-Modified": new Date().toUTCString(),
        ETag: `"${Date.now()}"`,
      },
    })
  } catch (error) {
    console.error("[v0] API: Error fetching products:", error)
    return NextResponse.json({ error: "Failed to fetch products" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { name, description, price, stock_quantity, brand, category, image_url } = body

    if (!name || !price) {
      return NextResponse.json({ error: "Name and price are required" }, { status: 400 })
    }

    const result = await sql`
      INSERT INTO products (name, description, price, stock_quantity, brand, category, image_url, is_active)
      VALUES (${name}, ${description || null}, ${price}, ${stock_quantity || 0}, ${brand || null}, ${category || null}, ${image_url || null}, true)
      RETURNING *
    `

    const newProduct = result[0]

    try {
      const { notifyNewProduct } = await import("@/lib/sse-notifications")
      notifyNewProduct(newProduct)
      console.log("[v0] SSE notification sent for new product")
    } catch (sseError) {
      console.error("[v0] SSE notification failed:", sseError)
      // Don't fail the request if SSE fails
    }

    return NextResponse.json(newProduct, { status: 201 })
  } catch (error) {
    console.error("[v0] API: Error creating product:", error)
    return NextResponse.json({ error: "Failed to create product" }, { status: 500 })
  }
}
