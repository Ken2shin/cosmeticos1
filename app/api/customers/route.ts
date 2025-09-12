import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function GET() {
  try {
    console.log("[v0] Fetching all customers from database...")

    const customers = await sql`
      SELECT 
        id,
        name,
        email,
        phone,
        address,
        total_orders,
        total_spent,
        first_purchase_date,
        last_purchase_date,
        created_at
      FROM customers 
      ORDER BY last_purchase_date DESC NULLS LAST, created_at DESC
    `

    console.log("[v0] Database returned", customers.length, "customers")

    const formattedCustomers = customers.map((customer) => ({
      ...customer,
      total_orders: Number(customer.total_orders) || 0,
      total_spent: Number(customer.total_spent) || 0,
    }))

    console.log("[v0] Formatted customers:", formattedCustomers)

    return NextResponse.json(formattedCustomers)
  } catch (error) {
    console.error("[v0] Error fetching customers:", error)
    return NextResponse.json({ error: "Failed to fetch customers" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { name, email, phone, address } = await request.json()

    if (!name || !email) {
      return NextResponse.json({ error: "Name and email are required" }, { status: 400 })
    }

    const customer = await sql`
      INSERT INTO customers (name, email, phone, address)
      VALUES (${name}, ${email}, ${phone || null}, ${address || null})
      RETURNING *
    `

    return NextResponse.json(customer[0], { status: 201 })
  } catch (error) {
    console.error("Error creating customer:", error)
    return NextResponse.json({ error: "Failed to create customer" }, { status: 500 })
  }
}
