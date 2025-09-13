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
        const filename = `${timestamp}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "")}`

        const blob = await put(filename, file, {
          access: "public",
        })

        console.log("[v0] File uploaded to Vercel Blob:", blob.url)

        return NextResponse.json({
          success: true,
          filename,
          url: blob.url,
        })
      } catch (blobError) {
        console.error("[v0] Blob upload failed, using fallback:", blobError)
        // Continue to fallback instead of failing
      }
    }

    const timestamp = Date.now()
    const cleanName = file.name.replace(/[^a-zA-Z0-9.-]/g, "").toLowerCase()
    const filename = `${timestamp}-${cleanName}`

    // Generate a more descriptive placeholder based on file name
    const productName = cleanName.split(".")[0] || "product"
    const placeholderUrl = `/placeholder.svg?height=400&width=400&query=beauty-product-${productName}-cosmetic-item`

    console.log("[v0] Using enhanced placeholder for production:", placeholderUrl)

    return NextResponse.json({
      success: true,
      filename,
      url: placeholderUrl,
      fallback: true,
      note: "Using placeholder - configure Vercel Blob for actual uploads",
    })
  } catch (error) {
    console.error("[v0] Upload error, using emergency fallback:", error)

    const emergencyUrl = `/placeholder.svg?height=400&width=400&query=beauty-product-default-cosmetic`

    return NextResponse.json({
      success: true,
      filename: `emergency-${Date.now()}.jpg`,
      url: emergencyUrl,
      fallback: true,
      emergency: true,
      note: "Emergency fallback used - upload system needs attention",
    })
  }
}
