import { NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function GET() {
  try {
    console.log("[v0] Currencies API: Fetching currencies from database")

    const currencies = await sql`
      SELECT code, name, symbol, flag_emoji 
      FROM currencies 
      ORDER BY code
    `

    console.log("[v0] Currencies API: Found", currencies.length, "currencies")
    return NextResponse.json(currencies)
  } catch (error) {
    console.error("[v0] Currencies API: Database error:", error)

    const fallbackCurrencies = [
      { code: "USD", name: "Dólar Estadounidense", symbol: "$", flag_emoji: "🇺🇸" },
      { code: "EUR", name: "Euro", symbol: "€", flag_emoji: "🇪🇺" },
      { code: "GBP", name: "Libra Esterlina", symbol: "£", flag_emoji: "🇬🇧" },
      { code: "JPY", name: "Yen Japonés", symbol: "¥", flag_emoji: "🇯🇵" },
      { code: "CAD", name: "Dólar Canadiense", symbol: "C$", flag_emoji: "🇨🇦" },
      { code: "AUD", name: "Dólar Australiano", symbol: "A$", flag_emoji: "🇦🇺" },
      { code: "CHF", name: "Franco Suizo", symbol: "CHF", flag_emoji: "🇨🇭" },
      { code: "CNY", name: "Yuan Chino", symbol: "¥", flag_emoji: "🇨🇳" },
      { code: "MXN", name: "Peso Mexicano", symbol: "$", flag_emoji: "🇲🇽" },
      { code: "BRL", name: "Real Brasileño", symbol: "R$", flag_emoji: "🇧🇷" },
      { code: "ARS", name: "Peso Argentino", symbol: "$", flag_emoji: "🇦🇷" },
      { code: "COP", name: "Peso Colombiano", symbol: "$", flag_emoji: "🇨🇴" },
    ]

    console.log("[v0] Currencies API: Returning fallback currencies")
    return NextResponse.json(fallbackCurrencies)
  }
}
