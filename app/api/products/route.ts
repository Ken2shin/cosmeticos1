import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET() {
  try {
    console.log("[v0] API: Fetching products with stock data")

    type Product = {
      id: number
      name: string
      description: string
      price: number
      stock_quantity: number | string
      brand: string
      category: string
      image_url: string
      is_active: boolean
      created_at: string
      updated_at: string
    }

    const result = await sql`
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
    `

    // If using @neondatabase/serverless, result is an array, not an object with rows
    const products: Product[] = (Array.isArray(result) ? result : ((result as { rows?: Product[] }).rows ?? [])) as Product[]

    const validatedProducts: Product[] = products.map((product) => ({
      ...product,
      stock_quantity: Math.max(0, Number.parseInt(product.stock_quantity as string) || 0), // Force non-negative integers
    }))

    console.log(
      "[v0] API: Products with stock:",
      validatedProducts.map((p: Product) => ({
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
