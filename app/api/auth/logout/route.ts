import { NextResponse } from "next/server"
import { cookies } from "next/headers"

export const dynamic = "force-dynamic"

export async function POST() {
  const cookieStore = await cookies()
  cookieStore.delete("admin-token")
  return NextResponse.json({ success: true })
}
