"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Upload, X, ImageIcon } from "lucide-react"
import Image from "next/image"

interface FileUploadProps {
  onFileSelect: (file: File | null) => void
  currentImage?: string
  accept?: string
}

const compressImage = (file: File, quality = 0.7): Promise<File> => {
  return new Promise((resolve) => {
    const canvas = document.createElement("canvas")
    const ctx = canvas.getContext("2d")
    const img = new window.Image()

    img.onload = () => {
      const isMobile = window.innerWidth < 768
      const maxWidth = isMobile ? 400 : 800 // Reduced for better mobile performance
      const maxHeight = isMobile ? 300 : 600 // Reduced for better mobile performance
      const compressionQuality = isMobile ? 0.3 : quality // More aggressive compression on mobile

      let { width, height } = img

      if (width > height) {
        if (width > maxWidth) {
          height = (height * maxWidth) / width
          width = maxWidth
        }
      } else {
        if (height > maxHeight) {
          width = (width * maxHeight) / height
          height = maxHeight
        }
      }

      canvas.width = width
      canvas.height = height

      if (ctx) {
        ctx.imageSmoothingEnabled = true
        ctx.imageSmoothingQuality = isMobile ? "low" : "medium" // Lower quality for mobile
        ctx.drawImage(img, 0, 0, width, height)
      }

      canvas.toBlob(
        (blob) => {
          if (blob) {
            const compressedFile = new File([blob], file.name, {
              type: "image/jpeg",
              lastModified: Date.now(),
            })
            console.log(
              `[v0] Image compressed: ${(file.size / 1024).toFixed(1)}KB → ${(compressedFile.size / 1024).toFixed(1)}KB`,
            )
            resolve(compressedFile)
          } else {
            resolve(file)
          }
        },
        "image/jpeg",
        compressionQuality,
      )
    }

    img.onerror = () => {
      console.error("[v0] Image compression failed, using original file")
      resolve(file)
    }

    img.crossOrigin = "anonymous" // Added crossOrigin for better mobile compatibility
    img.src = URL.createObjectURL(file)
  })
}

export function FileUpload({ onFileSelect, currentImage, accept = "image/*" }: FileUploadProps) {
  const [preview, setPreview] = useState<string | null>(currentImage || null)
  const [dragActive, setDragActive] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const previewUrlRef = useRef<string | null>(null)

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current)
      }
    }
  }, [])

  const handleFile = async (file: File) => {
    if (!file || !file.type.startsWith("image/")) {
      console.log("[v0] Invalid file type:", file?.type)
      return
    }

    console.log(`[v0] Processing image: ${file.name} (${(file.size / 1024).toFixed(1)}KB)`)

    const maxSize = window.innerWidth < 768 ? 2 * 1024 * 1024 : 5 * 1024 * 1024

    setIsLoading(true)

    try {
      let processedFile = file

      if (window.innerWidth < 768 || file.size > 50 * 1024) {
        const quality = window.innerWidth < 768 ? 0.2 : 0.5 // More aggressive compression
        processedFile = await compressImage(file, quality)
      }

      if (processedFile.size > maxSize) {
        console.log("[v0] File still too large, applying ultra compression")
        processedFile = await compressImage(file, 0.1) // Ultra compression for large files
      }

      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current)
      }

      const objectUrl = URL.createObjectURL(processedFile)
      previewUrlRef.current = objectUrl
      setPreview(objectUrl)
      onFileSelect(processedFile)

      console.log(`[v0] Image ready: ${(processedFile.size / 1024).toFixed(1)}KB`)
    } catch (error) {
      console.error("[v0] Error processing image:", error)
      alert("Error al procesar la imagen. Intenta con una imagen más pequeña.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0])
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0])
    }
  }

  const removeImage = () => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current)
      previewUrlRef.current = null
    }

    setPreview(null)
    onFileSelect(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  return (
    <div className="space-y-4">
      <Card
        className={`border transition-colors duration-200 ${
          dragActive ? "border-rose-400 bg-rose-50/50" : "border-border hover:border-rose-300"
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <CardContent className="p-4">
          {isLoading ? (
            <div className="text-center py-6">
              <div className="mx-auto w-12 h-12 bg-rose-100 rounded-full flex items-center justify-center mb-3">
                <div className="w-6 h-6 animate-spin rounded-full border-2 border-rose-500 border-t-transparent" />
              </div>
              <p className="text-sm font-medium">Optimizando imagen...</p>
              <p className="text-xs text-muted-foreground mt-1">Comprimiendo para mejor rendimiento</p>
            </div>
          ) : preview ? (
            <div className="relative group">
              <div className="relative w-full h-40 rounded overflow-hidden bg-muted">
                <Image
                  src={preview || "/placeholder.svg"}
                  alt="Preview"
                  fill
                  className="object-cover"
                  loading="lazy"
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
              </div>
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="absolute top-1 right-1 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={removeImage}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="text-center py-6">
              <div className="mx-auto w-12 h-12 bg-rose-100 rounded-full flex items-center justify-center mb-3">
                <ImageIcon className="w-6 h-6 text-rose-500" />
              </div>
              <p className="text-sm font-medium mb-1">Sube una imagen</p>
              <p className="text-xs text-muted-foreground mb-3">Se optimizará automáticamente • Cualquier tamaño</p>
              <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                <Upload className="w-4 h-4 mr-2" />
                Seleccionar
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <input ref={fileInputRef} type="file" accept={accept} onChange={handleChange} className="hidden" />
    </div>
  )
}
