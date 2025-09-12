import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET() {
  try {
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
    `

    return NextResponse.json(products, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    })
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch products" }, { status: 500 })
  }
}
