import { NextResponse } from "next/server"
import { sql, isDatabaseAvailable, safeQuery } from "@/lib/db"

export const dynamic = "force-dynamic"

interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  stock_quantity: number | string;
  brand: string;
  category: string;
  image_url: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export async function GET() {
  try {
    console.log("[v0] API: Fetching products with stock data")

    const products = await safeQuery(async () => {
      return await sql`
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
    }, [])

    let finalProducts = products
    if (!products || products.length === 0) {
      console.log("[v0] No products found in database, checking if we should provide samples")
      if (!isDatabaseAvailable()) {
        finalProducts = [
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
            category: "marbellin",
            image_url: "/liquid-foundation-natural.jpg",
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ]
        console.log("[v0] Providing sample products for client display")
      }
    }

    const validatedProducts = finalProducts.map((product: Product) => ({
      ...product,
      stock_quantity: Math.max(0, Number.parseInt(product.stock_quantity as string) || 0),
    }))

    console.log(
      "[v0] API: Returning products:",
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
    const sampleProducts = [
      {
        id: 1,
        name: "Producto de Muestra",
        description: "Producto de ejemplo mientras se resuelven los problemas de conexión",
        price: 29.99,
        stock_quantity: 5,
        brand: "Sample Brand",
        category: "labial",
        image_url: "/beauty-product-sample.jpg",
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ]

    return NextResponse.json(sampleProducts, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
      },
    })
  }
}

export async function POST(request: Request) {
  try {
    if (!isDatabaseAvailable()) {
      return NextResponse.json({ error: "Database not available" }, { status: 503 })
    }

    const body = await request.json()
    const { name, description, price, stock_quantity, brand, category, image_url } = body

    if (!name || !price) {
      return NextResponse.json({ error: "Name and price are required" }, { status: 400 })
    }

    const result = await safeQuery(async () => {
      return await sql`
        INSERT INTO products (name, description, price, stock_quantity, brand, category, image_url, is_active)
        VALUES (${name}, ${description || null}, ${price}, ${stock_quantity || 0}, ${brand || null}, ${category || null}, ${image_url || null}, true)
        RETURNING *
      `
    }, [])

    if (result.length === 0) {
      return NextResponse.json({ error: "Failed to create product" }, { status: 500 })
    }

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
