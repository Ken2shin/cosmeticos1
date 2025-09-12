import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { cookies } from "next/headers"
import type { NextRequest } from "next/server"
import { validateDatabaseUrl } from "@/lib/env-validation"

const sql = neon(validateDatabaseUrl())

export async function GET() {
  try {
    console.log("[v0] Admin products API called")

    const cookieStore = await cookies()
    const token = cookieStore.get("admin-token")

    console.log("[v0] Token check:", token?.value ? "present" : "missing")

    if (!token?.value || token.value !== "authenticated") {
      console.log("[v0] Unauthorized access attempt")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log("[v0] Fetching admin products from database")

    try {
      await sql`SELECT 1 FROM products LIMIT 1`
      console.log("[v0] Products table exists")
    } catch (tableError) {
      console.error("[v0] Products table does not exist:", tableError)
      return NextResponse.json(
        { error: "Database table not found", details: "Products table does not exist" },
        { status: 500 },
      )
    }

    const products = await sql`
      SELECT p.*, c.symbol as currency_symbol, c.flag_emoji as currency_flag
      FROM products p
      LEFT JOIN currencies c ON p.currency_code = c.code
      ORDER BY p.created_at DESC
    `

    console.log("[v0] Products fetched successfully:", products.length)
    return NextResponse.json(products)
  } catch (error) {
    console.error("[v0] Error fetching admin products:", error)
    return NextResponse.json(
      {
        error: "Failed to fetch products",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get("admin-token")

    if (!token?.value || token.value !== "authenticated") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const productData = await request.json()
    console.log("[v0] Creating new product:", productData)

    const result = await sql`
      INSERT INTO products (
        name, 
        description, 
        price, 
        currency_code, 
        brand, 
        category_id, 
        stock_quantity, 
        image_url, 
        is_active,
        sku,
        cost_price,
        min_stock_level
      )
      VALUES (
        ${productData.name}, 
        ${productData.description || ""}, 
        ${productData.price}, 
        ${productData.currency_code || "NIO"}, 
        ${productData.brand || ""}, 
        ${productData.category_id || null}, 
        ${productData.stock_quantity || 0}, 
        ${productData.image_url || ""}, 
        ${productData.is_active !== false},
        ${productData.sku || "SIN-SKU"},
        ${productData.cost_price || 0},
        ${productData.min_stock_level || 0}
      )
      RETURNING *
    `

    console.log("[v0] Product created successfully:", result[0])
    return NextResponse.json(result[0])
  } catch (error) {
    console.error("[v0] Error creating product:", error)
    return NextResponse.json(
      {
        error: "Failed to create product",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
