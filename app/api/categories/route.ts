import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET() {
  try {
    const categories = await sql`
      SELECT DISTINCT category as name, category as description
      FROM products 
      WHERE category IS NOT NULL AND category != ''
      ORDER BY category
    `

    return NextResponse.json(categories, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    })
  } catch (error) {
    return NextResponse.json([], { status: 200 })
  }
}

export async function POST(request: Request) {
  try {
    const { name, description } = await request.json()

    return NextResponse.json(
      {
        message: "Categories are auto-generated from products",
      },
      { status: 200 },
    )
  } catch (error) {
    return NextResponse.json({ error: "Failed to create category" }, { status: 500 })
  }
}
