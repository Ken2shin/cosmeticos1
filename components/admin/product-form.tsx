"use client"

import type React from "react"
import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Plus } from "lucide-react"
import { FileUpload } from "@/components/upload/file-upload"
import { CurrencySelector } from "./currency-selector"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import type { Product } from "@/types/product"

interface ProductFormProps {
  product?: Product | null
  onClose: (shouldRefresh?: boolean) => void
}

interface Category {
  id: number
  name: string
}

export function ProductForm({ product, onClose }: ProductFormProps) {
  const [categories, setCategories] = useState<Category[]>([])
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [showNewCategory, setShowNewCategory] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState("")
  const { toast } = useToast()
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    category: "",
    brand: "",
    image_url: "",
    currency_code: "USD",
    is_active: true,
    sku: "",
  })

  const fetchCategories = useCallback(async () => {
    try {
      console.log("[v0] Fetching categories for form...")
      const response = await fetch("/api/categories", {
        cache: "no-store",
        headers: {
          "Cache-Control": "no-cache",
        },
      })

      if (response.ok) {
        const data = await response.json()
        console.log("[v0] Categories fetched for form:", data.length)
        setCategories(data)
      } else {
        console.error("[v0] Failed to fetch categories:", response.status)
        setCategories([])
      }
    } catch (error) {
      console.error("[v0] Error fetching categories:", error)
      setCategories([])
    }
  }, [])

  useEffect(() => {
    fetchCategories()
  }, [fetchCategories])

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name,
        description: product.description || "",
        price: product.price.toString(),
        category: product.category,
        brand: product.brand || "",
        image_url: product.image_url || "",
        currency_code: product.currency_code || "USD",
        is_active: product.is_active,
        sku: product.sku || "",
      })
    }
  }, [product])

  const uploadFile = async (file: File): Promise<string> => {
    console.log("[v0] Starting file upload:", file.name, "Size:", file.size, "Type:", file.type)

    if (file.size > 10 * 1024 * 1024) {
      // 10MB limit
      console.warn("[v0] File too large, using fallback")
      return `/placeholder.svg?height=400&width=400&query=${encodeURIComponent(file.name.split(".")[0] + " beauty cosmetic product")}`
    }

    const formData = new FormData()
    formData.append("file", file)

    try {
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      })

      console.log("[v0] Upload response status:", response.status)

      if (!response.ok) {
        console.error("[v0] Upload failed with status:", response.status)
        const fallbackUrl = `/placeholder.svg?height=400&width=400&query=${encodeURIComponent(file.name.split(".")[0] + " beauty cosmetic product")}`
        console.log("[v0] Using fallback URL:", fallbackUrl)
        return fallbackUrl
      }

      const result = await response.json()
      console.log("[v0] Upload successful, received URL:", result.url)
      return result.url
    } catch (error) {
      console.error("[v0] Upload error, using emergency fallback:", error)
      const emergencyUrl = `/placeholder.svg?height=400&width=400&query=${encodeURIComponent("beauty cosmetic product " + Date.now())}`
      console.log("[v0] Using emergency URL:", emergencyUrl)
      return emergencyUrl
    }
  }

  const addNewCategory = async () => {
    if (!newCategoryName.trim()) return

    try {
      const response = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newCategoryName.trim() }),
      })

      if (response.ok) {
        await fetchCategories()
        setFormData({ ...formData, category: newCategoryName.trim() })
        setNewCategoryName("")
        setShowNewCategory(false)
        toast({
          title: "Categoría creada",
          description: `La categoría "${newCategoryName.trim()}" se ha creado exitosamente.`,
          variant: "default",
        })
      }
    } catch (error) {
      console.error("Error adding category:", error)
      toast({
        title: "Error",
        description: "No se pudo crear la categoría. Intenta de nuevo.",
        variant: "destructive",
      })
    }
  }

  const generateSKU = () => {
    const prefix = formData.name.substring(0, 3).toUpperCase()
    const timestamp = Date.now().toString().slice(-6)
    const randomNum = Math.floor(Math.random() * 100)
      .toString()
      .padStart(2, "0")
    return `${prefix}${timestamp}${randomNum}`
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setUploading(true)

    try {
      let imageUrl = formData.image_url

      if (selectedFile) {
        console.log("[v0] Processing selected file for upload:", selectedFile.name)
        try {
          imageUrl = await uploadFile(selectedFile)
          console.log("[v0] File upload completed, final URL:", imageUrl)
        } catch (uploadError) {
          console.error("[v0] Upload failed, using generated fallback:", uploadError)
          imageUrl = `/placeholder.svg?height=400&width=400&query=${encodeURIComponent(formData.name + " beauty cosmetic product")}`
        }
      } else if (!imageUrl) {
        console.log("[v0] No file selected, generating placeholder URL")
        imageUrl = `/placeholder.svg?height=400&width=400&query=${encodeURIComponent(formData.name + " beauty cosmetic product")}`
      }

      const finalSKU = formData.sku.trim() || generateSKU()

      const productData = {
        ...formData,
        image_url: imageUrl,
        price: Number.parseFloat(formData.price),
        sku: finalSKU,
      }

      console.log("[v0] Submitting product data:", {
        ...productData,
        image_url: imageUrl.substring(0, 100) + (imageUrl.length > 100 ? "..." : ""),
      })

      const url = product ? `/api/admin/products/${product.id}` : "/api/admin/products"
      const method = product ? "PUT" : "POST"

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(productData),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `Failed to save product: ${response.status}`)
      }

      const savedProduct = await response.json()
      console.log("[v0] Product saved successfully with image:", savedProduct.image_url)

      if (product) {
        window.dispatchEvent(new CustomEvent("productUpdated", { detail: savedProduct }))
        toast({
          title: "¡Producto actualizado!",
          description: `${formData.name} se ha actualizado exitosamente.`,
          variant: "default",
        })
      } else {
        window.dispatchEvent(new CustomEvent("productCreated", { detail: savedProduct }))
        toast({
          title: "¡Producto creado!",
          description: `${formData.name} se ha creado exitosamente y está disponible en el catálogo.`,
          variant: "default",
        })
      }

      console.log("[v0] Triggering UI refresh...")
      setTimeout(() => {
        onClose(true)
      }, 100)
    } catch (error) {
      console.error("[v0] Error saving product:", error)
      toast({
        title: "Error al guardar",
        description: error instanceof Error ? error.message : "Error desconocido al guardar el producto",
        variant: "destructive",
      })
    } finally {
      setUploading(false)
    }
  }

  return (
    <Card className="max-w-2xl mx-auto animate-in fade-in-0 slide-in-from-bottom-4 duration-500">
      <CardHeader>
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onClose(false)}
            className="hover:scale-110 transition-transform"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <CardTitle className="bg-gradient-to-r from-rose-600 to-pink-600 bg-clip-text text-transparent">
            {product ? "Editar Producto" : "Nuevo Producto"}
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre del Producto</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="transition-all duration-200 focus:ring-2 focus:ring-rose-500"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="sku">SKU (Código del Producto)</Label>
              <Input
                id="sku"
                value={formData.sku}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                placeholder="Se generará automáticamente si se deja vacío"
                className="transition-all duration-200 focus:ring-2 focus:ring-rose-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="description">Descripción</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="transition-all duration-200 focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="brand">Marca</Label>
              <Input
                id="brand"
                value={formData.brand}
                onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                className="transition-all duration-200 focus:ring-2 focus:ring-rose-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="price">Precio</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                max="99999999.99"
                min="0"
                value={formData.price}
                onChange={(e) => {
                  const value = e.target.value
                  if (Number.parseFloat(value) > 99999999.99) {
                    toast({
                      title: "Precio demasiado alto",
                      description: "El precio máximo permitido es $99,999,999.99",
                      variant: "destructive",
                    })
                    return
                  }
                  setFormData({ ...formData, price: value })
                }}
                className="transition-all duration-200 focus:ring-2 focus:ring-rose-500"
                required
              />
              <p className="text-xs text-muted-foreground">Precio máximo: $99,999,999.99</p>
            </div>

            <div className="space-y-2">
              <Label>Moneda</Label>
              <CurrencySelector
                value={formData.currency_code}
                onValueChange={(value) => setFormData({ ...formData, currency_code: value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Categoría</Label>
              <div className="flex gap-2">
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData({ ...formData, category: value })}
                >
                  <SelectTrigger className="transition-all duration-200 focus:ring-2 focus:ring-rose-500">
                    <SelectValue placeholder="Seleccionar categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.name}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Dialog open={showNewCategory} onOpenChange={setShowNewCategory}>
                  <DialogTrigger asChild>
                    <Button type="button" variant="outline" size="icon">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent aria-describedby="new-category-description">
                    <DialogHeader>
                      <DialogTitle>Nueva Categoría</DialogTitle>
                    </DialogHeader>
                    <p id="new-category-description" className="text-sm text-muted-foreground">
                      Crea una nueva categoría para organizar tus productos.
                    </p>
                    <div className="space-y-4">
                      <Input
                        placeholder="Nombre de la categoría"
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault()
                            addNewCategory()
                          }
                        }}
                      />
                      <div className="flex gap-2">
                        <Button onClick={addNewCategory} className="flex-1" disabled={!newCategoryName.trim()}>
                          Agregar
                        </Button>
                        <Button variant="outline" onClick={() => setShowNewCategory(false)}>
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Imagen del Producto</Label>
            <FileUpload onFileSelect={setSelectedFile} currentImage={formData.image_url} />
            {(selectedFile || formData.image_url) && (
              <div className="mt-2">
                <div className="w-32 h-32 bg-gray-100 rounded-lg overflow-hidden border">
                  <img
                    src={selectedFile ? URL.createObjectURL(selectedFile) : formData.image_url}
                    alt="Vista previa"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      console.log("[v0] Preview image failed to load")
                      const target = e.target as HTMLImageElement
                      target.src = `/placeholder.svg?height=128&width=128&query=preview-${formData.name || "product"}`
                    }}
                    onLoad={() => {
                      console.log("[v0] Preview image loaded successfully")
                    }}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">Vista previa de la imagen</p>
              </div>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="is_active"
              checked={formData.is_active}
              onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
            />
            <Label htmlFor="is_active">Producto activo</Label>
          </div>

          <div className="flex gap-4">
            <Button
              type="submit"
              className="flex-1 bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 transition-all duration-300 transform hover:scale-[1.02]"
              disabled={uploading}
            >
              {uploading ? "Guardando..." : product ? "Actualizar" : "Crear"} Producto
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => onClose(false)}
              className="hover:scale-105 transition-transform bg-transparent"
            >
              Cancelar
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
