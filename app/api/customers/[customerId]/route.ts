import { NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { notifyCustomerDeleted } from "@/lib/sse-notifications"

export async function GET(request: Request, { params }: { params: { customerId: string } }) {
  try {
    const customerId = Number.parseInt(params.customerId)

    if (isNaN(customerId) || customerId <= 0) {
      return NextResponse.json({ error: "Invalid customer ID" }, { status: 400 })
    }

    const customer = await sql`
      SELECT * FROM customers WHERE id = ${customerId}
    `

    if (customer.length === 0) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 })
    }

    return NextResponse.json(customer[0])
  } catch (error) {
    console.error("Error fetching customer:", error)
    return NextResponse.json({ error: "Failed to fetch customer" }, { status: 500 })
  }
}

export async function PUT(request: Request, { params }: { params: { customerId: string } }) {
  try {
    const customerId = Number.parseInt(params.customerId)
    const { name, email, phone, address } = await request.json()

    if (isNaN(customerId) || customerId <= 0) {
      return NextResponse.json({ error: "Invalid customer ID" }, { status: 400 })
    }

    const result = await sql`
      UPDATE customers 
      SET 
        name = ${name},
        email = ${email},
        phone = ${phone || null},
        address = ${address || null},
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ${customerId}
      RETURNING *
    `

    if (result.length === 0) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 })
    }

    return NextResponse.json(result[0])
  } catch (error) {
    console.error("Error updating customer:", error)
    return NextResponse.json({ error: "Failed to update customer" }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: { customerId: string } }) {
  try {
    const customerId = Number.parseInt(params.customerId)

    if (isNaN(customerId) || customerId <= 0) {
      return NextResponse.json({ error: "Invalid customer ID" }, { status: 400 })
    }

    const result = await sql`
      DELETE FROM customers WHERE id = ${customerId}
      RETURNING *
    `

    if (result.length === 0) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 })
    }

    try {
      notifyCustomerDeleted(customerId.toString())
      console.log("[v0] Real-time SSE notification sent for customer deletion")
    } catch (sseError) {
      console.error("[v0] SSE notification failed:", sseError)
      // Don't fail the request if SSE fails
    }

    return NextResponse.json({ message: "Customer deleted successfully" })
  } catch (error) {
    console.error("Error deleting customer:", error)
    return NextResponse.json({ error: "Failed to delete customer" }, { status: 500 })
  }
}
