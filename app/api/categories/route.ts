import { NextResponse } from "next/server"
import { sql, isDatabaseAvailable, safeQuery } from "@/lib/db"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    console.log("[v0] Fetching categories from database...")

    const categories = await safeQuery(async () => {
      return await sql`
        SELECT id, name, description, created_at
        FROM categories 
        ORDER BY name
      `
    }, [])

    if (!categories || categories.length === 0) {
      console.log("[v0] No categories table found, trying products fallback...")

      const productCategories = await safeQuery(async () => {
        return await sql`
          SELECT DISTINCT 
            ROW_NUMBER() OVER (ORDER BY category) as id,
            category as name, 
            category as description,
            NOW() as created_at
          FROM products 
          WHERE category IS NOT NULL AND category != ''
          ORDER BY category
        `
      }, [])

      if (productCategories && productCategories.length > 0) {
        console.log("[v0] Product categories fallback:", productCategories.length, "categories found")
        return NextResponse.json(productCategories, {
          headers: {
            "Cache-Control": "no-store, no-cache, must-revalidate",
            Pragma: "no-cache",
            Expires: "0",
          },
        })
      }

      console.log("[v0] Using default categories fallback")
      const defaultCategories = [
        { id: 1, name: "labial", description: "Productos para labios", created_at: new Date().toISOString() },
        { id: 2, name: "marbellin", description: "Productos Marbellin", created_at: new Date().toISOString() },
        { id: 3, name: "ojos", description: "Productos para ojos", created_at: new Date().toISOString() },
      ]

      return NextResponse.json(defaultCategories, {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      })
    }

    console.log("[v0] Categories fetched successfully:", categories.length, "categories found")

    return NextResponse.json(categories, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    })
  } catch (error) {
    console.error("[v0] Error fetching categories:", error)

    const fallbackCategories = [
      { id: 1, name: "labial", description: "Productos para labios", created_at: new Date().toISOString() },
      { id: 2, name: "marbellin", description: "Productos Marbellin", created_at: new Date().toISOString() },
    ]

    return NextResponse.json(fallbackCategories, { status: 200 })
  }
}

export async function POST(request: Request) {
  try {
    if (!isDatabaseAvailable()) {
      return NextResponse.json(
        {
          error: "Database not available. Please try again later.",
        },
        { status: 503 },
      )
    }

    const { name, description } = await request.json()

    if (!name || name.trim() === "") {
      return NextResponse.json({ error: "Category name is required" }, { status: 400 })
    }

    console.log("[v0] Creating category:", name.trim())

    const result = await safeQuery(async () => {
      return await sql`
        INSERT INTO categories (name, description, created_at)
        VALUES (${name.trim()}, ${description || name.trim()}, NOW())
        ON CONFLICT (name) DO UPDATE SET 
          description = EXCLUDED.description,
          created_at = NOW()
        RETURNING id, name, description, created_at
      `
    }, [])

    if (!result || result.length === 0) {
      return NextResponse.json({ error: "Failed to create category" }, { status: 500 })
    }

    console.log("[v0] Category created successfully:", result[0])
    return NextResponse.json(result[0], { status: 201 })
  } catch (error) {
    console.error("[v0] Error creating category:", error)
    return NextResponse.json({ error: "Failed to create category" }, { status: 500 })
  }
}
