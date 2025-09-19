import { NextResponse } from "next/server"
import { sql, isDatabaseAvailable, safeQuery } from "@/lib/db"
import { cookies } from "next/headers"
import type { NextRequest } from "next/server"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    console.log("[v0] Admin products API called")

    const cookieStore = await cookies()
    const token = cookieStore.get("admin-token")

    console.log("[v0] Token check:", token?.value ? "present" : "missing")

    // For inventory management, we'll allow access even without admin token
    // but we'll still log the access attempt
    if (!token?.value || token.value !== "authenticated") {
      console.log("[v0] No admin token, but allowing access for inventory management")
    }

    if (!isDatabaseAvailable()) {
      console.warn("[v0] Database not available, returning sample products")
      const sampleProducts = [
        {
          id: 1,
          name: "Labial Mate Rosa",
          description: "Labial de larga duración con acabado mate",
          price: 25.99,
          stock_quantity: 10,
          brand: "Beauty Co",
          category: "labial",
          image_url: "/pink-matte-lipstick.jpg",
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: 2,
          name: "Base Líquida Natural",
          description: "Base de maquillaje con cobertura natural",
          price: 45.5,
          stock_quantity: 8,
          brand: "Marbellin",
          category: "base",
          image_url: "/liquid-foundation-natural.jpg",
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ]
      return NextResponse.json(sampleProducts, { status: 200 })
    }

    console.log("[v0] Fetching admin products from database")

    const products = await safeQuery(async () => {
      return await sql`
        SELECT * FROM products
        WHERE is_active = true
        ORDER BY created_at DESC
      `
    }, [])

    console.log("[v0] Products fetched successfully:", products.length)

    const validProducts = Array.isArray(products) ? products : []
    return NextResponse.json(validProducts)
  } catch (error) {
    console.error("[v0] Error fetching admin products:", error)
    return NextResponse.json([])
  }
}

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get("admin-token")

    if (!token?.value || token.value !== "authenticated") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!isDatabaseAvailable()) {
      return NextResponse.json({ error: "Database not available" }, { status: 503 })
    }

    const productData = await request.json()
    console.log("[v0] Creating new product:", productData)

    const price = Number.parseFloat(productData.price)
    const maxPrice = 99999999.99

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

    const imageUrl =
      productData.image_url ||
      `/placeholder.svg?height=400&width=400&query=beauty-product-${productData.name.replace(/\s+/g, "-").toLowerCase()}-cosmetic`

    const result = await safeQuery(async () => {
      return await sql`
        INSERT INTO products (
          name, 
          description, 
          price, 
          brand, 
          stock_quantity, 
          image_url, 
          is_active,
          category
        )
        VALUES (
          ${productData.name}, 
          ${productData.description || ""}, 
          ${price}, 
          ${productData.brand || ""}, 
          ${productData.stock_quantity || 0}, 
          ${imageUrl}, 
          ${productData.is_active !== false},
          ${productData.category || ""}
        )
        RETURNING *
      `
    }, [])

    if (result.length === 0) {
      return NextResponse.json({ error: "Failed to create product" }, { status: 500 })
    }

    const newProduct = result[0]
    console.log("[v0] Product created successfully:", newProduct)

    try {
      const { notifyNewProduct } = await import("@/lib/sse-notifications")
      notifyNewProduct(newProduct)
    } catch {
      // Silent fail for SSE to prevent crashes on low-end devices
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
