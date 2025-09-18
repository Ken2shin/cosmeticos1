import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { cookies } from "next/headers"
import type { NextRequest } from "next/server"
import { validateDatabaseUrl } from "@/lib/env-validation"

export const dynamic = "force-dynamic"

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

    const price = Number.parseFloat(productData.price)
    const maxPrice = 99999999.99 // Maximum value for DECIMAL(10,2)

    if (isNaN(price) || price < 0) {
      return NextResponse.json({ error: "El precio debe ser un número válido mayor a 0" }, { status: 400 })
    }

    if (price > maxPrice) {
      return NextResponse.json(
        {
          error: `El precio no puede exceder ${maxPrice.toLocaleString("es-ES", { style: "currency", currency: "USD" })}`,
        },
        { status: 400 },
      )
    }

    let categoryId = null
    if (productData.category) {
      try {
        // First try to find existing category
        const existingCategory = await sql`
          SELECT id FROM categories WHERE LOWER(name) = LOWER(${productData.category}) LIMIT 1
        `

        if (existingCategory.length > 0) {
          categoryId = existingCategory[0].id
        } else {
          // Create new category if it doesn't exist
          const newCategory = await sql`
            INSERT INTO categories (name) VALUES (${productData.category}) RETURNING id
          `
          categoryId = newCategory[0].id
          console.log("[v0] Created new category:", productData.category, "with ID:", categoryId)
        }
      } catch (categoryError) {
        console.error("[v0] Error handling category:", categoryError)
        // Continue without category if there's an error
      }
    }

    const imageUrl =
      productData.image_url ||
      `/placeholder.svg?height=400&width=400&query=beauty-product-${productData.name.replace(/\s+/g, "-").toLowerCase()}-cosmetic`
    console.log("[v0] Using image URL:", imageUrl)

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
        min_stock_level,
        category
      )
      VALUES (
        ${productData.name}, 
        ${productData.description || ""}, 
        ${price}, 
        ${productData.currency_code || "NIO"}, 
        ${productData.brand || ""}, 
        ${categoryId}, 
        ${productData.stock_quantity || 0}, 
        ${imageUrl}, 
        ${productData.is_active !== false},
        ${productData.sku || `SKU-${Date.now()}`},
        ${productData.cost_price || 0},
        ${productData.min_stock_level || 0},
        ${productData.category || ""}
      )
      RETURNING *
    `

    const newProduct = result[0]
    console.log("[v0] Product created successfully with image:", newProduct)

    try {
      const { notifyNewProduct } = await import("@/lib/sse-notifications")
      notifyNewProduct(newProduct)
      console.log("[v0] Real-time SSE notification sent for new product")
    } catch (sseError) {
      console.error("[v0] SSE notification failed:", sseError)
      // Don't fail the request if SSE fails
    }

    return NextResponse.json(newProduct)
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
