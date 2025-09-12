"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Upload, X, ImageIcon } from "lucide-react"
import Image from "next/image"

interface FileUploadProps {
  onFileSelect: (file: File | null) => void
  currentImage?: string
  accept?: string
}

export function FileUpload({ onFileSelect, currentImage, accept = "image/*" }: FileUploadProps) {
  const [preview, setPreview] = useState<string | null>(currentImage || null)
  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFile = (file: File) => {
    if (file && file.type.startsWith("image/")) {
      const reader = new FileReader()
      reader.onload = (e) => {
        setPreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)
      onFileSelect(file)
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
    setPreview(null)
    onFileSelect(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  return (
    <div className="space-y-4">
      <Card
        className={`border-2 border-dashed transition-all duration-300 ${
          dragActive ? "border-rose-500 bg-rose-50 scale-105" : "border-muted-foreground/25 hover:border-rose-300"
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <CardContent className="p-6">
          {preview ? (
            <div className="relative group">
              <div className="relative w-full h-48 rounded-lg overflow-hidden">
                <Image
                  src={preview || "/placeholder.svg"}
                  alt="Preview"
                  fill
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                />
              </div>
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                onClick={removeImage}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="mx-auto w-16 h-16 bg-gradient-to-br from-rose-100 to-pink-100 rounded-full flex items-center justify-center mb-4 animate-pulse">
                <ImageIcon className="w-8 h-8 text-rose-500" />
              </div>
              <p className="text-lg font-medium mb-2">Sube una imagen del producto</p>
              <p className="text-muted-foreground mb-4">Arrastra y suelta o haz clic para seleccionar</p>
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className="transition-all duration-200 hover:scale-105"
              >
                <Upload className="w-4 h-4 mr-2" />
                Seleccionar Archivo
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <input ref={fileInputRef} type="file" accept={accept} onChange={handleChange} className="hidden" />
    </div>
  )
}
