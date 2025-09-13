import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { notifyOrderDeleted } from "@/lib/websocket-server";

export async function GET(request: Request, { params }: { params: { orderId: string } }) {
  try {
    const orderId = Number.parseInt(params.orderId);

    if (isNaN(orderId) || orderId <= 0) {
      return NextResponse.json({ error: "Invalid order ID" }, { status: 400 });
    }

    const order = await sql`
      SELECT o.*, 
             json_agg(
               json_build_object(
                 'product_id', oi.product_id,
                 'quantity', oi.quantity,
                 'unit_price', oi.unit_price,
                 'total_price', oi.total_price,
                 'product_name', p.name
               )
             ) as items
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      LEFT JOIN products p ON oi.product_id = p.id
      WHERE o.id = ${orderId}
      GROUP BY o.id
    `;

    if (order.length === 0) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    return NextResponse.json(order[0]);
  } catch (error) {
    console.error("Error fetching order:", error);
    return NextResponse.json({ error: "Failed to fetch order" }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: { orderId: string } }) {
  try {
    console.log("[v0] Order Update API: Starting update for order:", params.orderId);

    const orderId = Number.parseInt(params.orderId);
    const body = await request.json();
    console.log("[v0] Order Update API: Received body:", body);

    const { status, customer_name, customer_email, customer_phone } = body;

    if (isNaN(orderId) || orderId <= 0) {
      console.error("[v0] Order Update API: Invalid order ID:", params.orderId);
      return NextResponse.json({ error: "Invalid order ID" }, { status: 400 });
    }

    if (!status) {
      console.error("[v0] Order Update API: Status is required");
      return NextResponse.json({ error: "Status is required" }, { status: 400 });
    }

    // Validate status values
    const validStatuses = ["pending", "completed", "cancelled"];
    if (!validStatuses.includes(status)) {
      console.error("[v0] Order Update API: Invalid status:", status);
      return NextResponse.json({ error: "Invalid status value" }, { status: 400 });
    }

    console.log("[v0] Order Update API: Updating order with validated data");

    const result = await sql`
      UPDATE orders 
      SET 
        status = ${status},
        customer_name = COALESCE(${customer_name}, customer_name),
        customer_email = COALESCE(${customer_email}, customer_email),
        customer_phone = COALESCE(${customer_phone}, customer_phone),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ${orderId}
      RETURNING *
    `;

    console.log("[v0] Order Update API: Update result:", result.length > 0 ? "Success" : "No rows affected");

    if (result.length === 0) {
      console.error("[v0] Order Update API: Order not found:", orderId);
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    console.log("[v0] Order Update API: Order updated successfully:", result[0]);

    console.log("[v0] Order Update API: Triggering stats refresh");

    return NextResponse.json({
      ...result[0],
      message: "Order updated successfully",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[v0] Order Update API: Error updating order:", error);

    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;

    console.error("[v0] Order Update API: Error stack:", errorStack);
    return NextResponse.json(
      {
        error: "Failed to update order: " + errorMessage,
        details: errorMessage,
      },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request, { params }: { params: { orderId: string } }) {
  try {
    const orderId = Number.parseInt(params.orderId);

    if (isNaN(orderId) || orderId <= 0) {
      return NextResponse.json({ error: "Invalid order ID" }, { status: 400 });
    }

    // First delete order items
    await sql`DELETE FROM order_items WHERE order_id = ${orderId}`;

    // Then delete the order
    const result = await sql`
      DELETE FROM orders WHERE id = ${orderId}
      RETURNING *
    `;

    if (result.length === 0) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    try {
      notifyOrderDeleted(orderId.toString()); // Convert to string
      console.log("[v0] Real-time notification sent for order deletion");
    } catch (wsError) {
      console.error("[v0] WebSocket notification failed:", wsError);
      // Don't fail the request if WebSocket fails
    }

    return NextResponse.json({ message: "Order deleted successfully" });
  } catch (error) {
    console.error("Error deleting order:", error);
    return NextResponse.json({ error: "Failed to delete order" }, { status: 500 });
  }
}