import { type NextRequest, NextResponse } from "next/server"
import { writeFile, mkdir } from "fs/promises"
import { join } from "path"
import { existsSync } from "fs"

export async function POST(request: NextRequest) {
  try {
    console.log("[v0] Upload request received")

    const data = await request.formData()
    const file: File | null = data.get("file") as unknown as File

    if (!file) {
      console.log("[v0] No file in request")
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 })
    }

    console.log("[v0] File received:", file.name, "Size:", file.size)

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    const uploadsDir = join(process.cwd(), "public/uploads")
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true })
      console.log("[v0] Created uploads directory")
    }

    const timestamp = Date.now()
    const filename = `${timestamp}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "")}`
    const path = join(uploadsDir, filename)

    await writeFile(path, buffer)
    console.log("[v0] File saved successfully:", filename)

    return NextResponse.json({
      success: true,
      filename,
      url: `/uploads/${filename}`,
    })
  } catch (error) {
    console.error("[v0] Upload error:", error)
    return NextResponse.json(
      {
        error: "Upload failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
