// app/api/products/route.ts
import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { notifyNewProduct } from "@/lib/websocket-server";

/**
 * Nota:
 * - Este archivo usa casteos a `any` deliberadamente para "fuerza bruta"
 *   y silenciar errores de tipos en tiempo de compilación.
 * - Si quieres más adelante, puedo tipar correctamente la respuesta de la DB.
 */

export async function GET() {
  try {
    console.log("[v0] API: Fetching products with stock data");

    // Fuerza bruta: casteamos el resultado de la consulta a any[]
    const productsRaw = (await sql`
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
    `) as any[];

    // Normalizamos / validamos algunos campos y forzamos tipos con any
    const validatedProducts = productsRaw.map((product: any) => {
      const stock = Number.parseInt(String(product?.stock_quantity ?? "0")) || 0;
      return {
        ...product,
        // forzamos que stock_quantity sea un entero no negativo
        stock_quantity: Math.max(0, stock),
        // forzamos is_active boolean
        is_active: Boolean(product?.is_active),
      } as any;
    }) as any[];

    // Log detallado (forzando any para evitar errores TS)
    console.log(
      "[v0] API: Products with stock:",
      validatedProducts.map((p: any) => ({
        name: p.name,
        stock: p.stock_quantity,
        active: p.is_active,
      })),
    );

    return NextResponse.json(validatedProducts, {
      status: 200,
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
        Pragma: "no-cache",
        Expires: "0",
        "Last-Modified": new Date().toUTCString(),
        ETag: `"${Date.now()}"`,
      },
    });
  } catch (error) {
    console.error("[v0] API: Error fetching products:", error);
    return NextResponse.json({ error: "Failed to fetch products" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    // Fuerza bruta: tratamos el body como any
    const body = (await request.json()) as any;
    const { name, description, price, stock_quantity, brand, category, image_url } = body;

    if (!name || price === undefined || price === null) {
      return NextResponse.json({ error: "Name and price are required" }, { status: 400 });
    }

    // Aseguramos tipos básicos
    const priceNum = Number(price);
    const stockNum = Number(stock_quantity ?? 0);

    // Inserción: casteamos el resultado a any[]
    const result = (await sql`
      INSERT INTO products (name, description, price, stock_quantity, brand, category, image_url, is_active)
      VALUES (${name}, ${description ?? null}, ${priceNum}, ${stockNum}, ${brand ?? null}, ${category ?? null}, ${image_url ?? null}, true)
      RETURNING *
    `) as any[];

    const newProduct = (result && result[0]) as any;

    // Notificación WebSocket (la forzamos a any para evitar errores de tipo)
    try {
      (notifyNewProduct as any)(newProduct as any);
      console.log("[v0] WebSocket notification sent for new product");
    } catch (wsError) {
      console.error("[v0] WebSocket notification failed:", wsError);
      // No fallamos la request por culpa del WS
    }

    return NextResponse.json(newProduct, { status: 201 });
  } catch (error) {
    console.error("[v0] API: Error creating product:", error);
    return NextResponse.json({ error: "Failed to create product" }, { status: 500 });
  }
}
