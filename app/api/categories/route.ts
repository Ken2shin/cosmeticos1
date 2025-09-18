import { NextResponse } from "next/server"
import { sql } from "@/lib/db"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    console.log("[v0] Fetching categories from database...")

    const categories = await sql`
      SELECT id, name, description, created_at
      FROM categories 
      ORDER BY name
    `

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

    try {
      console.log("[v0] Categories table not found, trying products fallback...")
      const productCategories = await sql`
        SELECT DISTINCT 
          ROW_NUMBER() OVER (ORDER BY category) as id,
          category as name, 
          category as description,
          NOW() as created_at
        FROM products 
        WHERE category IS NOT NULL AND category != ''
        ORDER BY category
      `

      console.log("[v0] Product categories fallback:", productCategories.length, "categories found")
      return NextResponse.json(productCategories)
    } catch (fallbackError) {
      console.error("[v0] Fallback also failed:", fallbackError)

      return NextResponse.json([], { status: 200 })
    }
  }
}

export async function POST(request: Request) {
  try {
    const { name, description } = await request.json()

    if (!name || name.trim() === "") {
      return NextResponse.json({ error: "Category name is required" }, { status: 400 })
    }

    console.log("[v0] Creating category:", name.trim())

    const result = await sql`
      INSERT INTO categories (name, description, created_at)
      VALUES (${name.trim()}, ${description || name.trim()}, NOW())
      ON CONFLICT (name) DO UPDATE SET 
        description = EXCLUDED.description,
        created_at = NOW()
      RETURNING id, name, description, created_at
    `

    console.log("[v0] Category created successfully:", result[0])
    return NextResponse.json(result[0], { status: 201 })
  } catch (error) {
    console.error("[v0] Error creating category:", error)
    return NextResponse.json({ error: "Failed to create category" }, { status: 500 })
  }
}
