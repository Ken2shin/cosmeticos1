import { NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function POST(request: Request) {
  try {
    const { items } = await request.json()

    if (!items || !Array.isArray(items)) {
      return NextResponse.json({ error: "Items array is required" }, { status: 400 })
    }

    const stockCheck = []
    let allAvailable = true

    for (const item of items) {
      const { id, quantity } = item

      const product = await sql`
        SELECT 
          id,
          name,
          stock_quantity,
          min_stock_level,
          is_active
        FROM products 
        WHERE id = ${id} AND is_active = true
      `

      if (product.length === 0) {
        stockCheck.push({
          product_id: id,
          available: false,
          reason: "product_not_found",
          current_stock: 0,
          requested_quantity: quantity,
        })
        allAvailable = false
        continue
      }

      const currentStock = product[0].stock_quantity || 0
      const isAvailable = currentStock >= quantity

      if (!isAvailable) {
        allAvailable = false
      }

      stockCheck.push({
        product_id: id,
        product_name: product[0].name,
        available: isAvailable,
        current_stock: currentStock,
        requested_quantity: quantity,
        remaining_after_purchase: currentStock - quantity,
        reason: !isAvailable ? "insufficient_stock" : "available",
      })
    }

    return NextResponse.json({
      all_available: allAvailable,
      items: stockCheck,
      checked_at: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Error checking stock:", error)
    return NextResponse.json({ error: "Failed to check stock" }, { status: 500 })
  }
}
