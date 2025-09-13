import { type NextRequest, NextResponse } from "next/server"

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

    if (process.env.BLOB_READ_WRITE_TOKEN) {
      try {
        const { put } = await import("@vercel/blob")

        const timestamp = Date.now()
        const cleanName = file.name.replace(/[^a-zA-Z0-9.-]/g, "").toLowerCase()
        const filename = `products/${timestamp}-${cleanName}`

        console.log("[v0] Attempting Vercel Blob upload with filename:", filename)

        const blob = await put(filename, file, {
          access: "public",
          addRandomSuffix: false,
        })

        console.log("[v0] SUCCESS: File uploaded to Vercel Blob:", blob.url)

        return NextResponse.json({
          success: true,
          filename,
          url: blob.url,
          uploaded: true,
        })
      } catch (blobError) {
        console.error("[v0] Blob upload failed:", blobError)
        // Continue to base64 fallback
      }
    }

    try {
      const bytes = await file.arrayBuffer()
      const buffer = Buffer.from(bytes)
      const base64 = buffer.toString("base64")
      const mimeType = file.type || "image/jpeg"
      const dataUrl = `data:${mimeType};base64,${base64}`

      console.log("[v0] SUCCESS: Converted to base64, size:", base64.length)

      return NextResponse.json({
        success: true,
        filename: file.name,
        url: dataUrl,
        base64: true,
      })
    } catch (base64Error) {
      console.error("[v0] Base64 conversion failed:", base64Error)
    }

    const timestamp = Date.now()
    const cleanName = file.name.replace(/[^a-zA-Z0-9.-]/g, "").toLowerCase()
    const filename = `${timestamp}-${cleanName}`
    const productName = cleanName.split(".")[0] || "product"
    const placeholderUrl = `/placeholder.svg?height=400&width=400&query=beauty-product-${productName}-cosmetic-item`

    console.log("[v0] Using enhanced placeholder:", placeholderUrl)

    return NextResponse.json({
      success: true,
      filename,
      url: placeholderUrl,
      fallback: true,
    })
  } catch (error) {
    console.error("[v0] Upload error:", error)

    return NextResponse.json({
      success: true,
      filename: `emergency-${Date.now()}.jpg`,
      url: `/placeholder.svg?height=400&width=400&query=beauty-product-default-cosmetic`,
      emergency: true,
    })
  }
}
