"use client"

import type React from "react"
import { useState, useEffect, useCallback, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Plus } from "lucide-react"
import { FileUpload } from "@/components/upload/file-upload"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
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
      const response = await fetch("/api/categories", {
        cache: "no-store",
        headers: {
          "Cache-Control": "no-cache",
        },
      })

      if (response.ok) {
        const data = await response.json()
        setCategories(data)
      } else {
        setCategories([])
      }
    } catch (error) {
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
    console.log(`[v0] Uploading file: ${file.name}`)

    const formData = new FormData()
    formData.append("file", file)

    try {
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.status}`)
      }

      const result = await response.json()
      return result.url
    } catch (error) {
      console.error("[v0] Upload error:", error)
      return `/placeholder.svg?height=400&width=400&query=${encodeURIComponent("beauty cosmetic product")}`
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
      toast({
        title: "Error",
        description: "No se pudo crear la categoría. Intenta de nuevo.",
        variant: "destructive",
      })
    }
  }

  const generateSKU = useMemo(() => {
    const prefix = formData.name.substring(0, 3).toUpperCase() || "PRD"
    const timestamp = Date.now().toString().slice(-4)
    return `${prefix}${timestamp}`
  }, [formData.name])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setUploading(true)

    try {
      console.log("[v0] Starting product form submission")
      let imageUrl = formData.image_url

      if (selectedFile) {
        try {
          imageUrl = await uploadFile(selectedFile)
          if (selectedFile && typeof window !== "undefined") {
            URL.revokeObjectURL(URL.createObjectURL(selectedFile))
          }
        } catch (uploadError) {
          console.error("[v0] Upload failed:", uploadError)
          imageUrl = `/placeholder.svg?height=400&width=400&query=${encodeURIComponent(formData.name + " beauty product")}`
        }
      } else if (!imageUrl) {
        imageUrl = `/placeholder.svg?height=400&width=400&query=${encodeURIComponent(formData.name + " beauty product")}`
      }

      const productData = {
        name: formData.name,
        description: formData.description,
        price: Number.parseFloat(formData.price),
        category: formData.category,
        brand: formData.brand,
        image_url: imageUrl,
        is_active: formData.is_active,
        stock_quantity: 0, // Default stock quantity
      }

      console.log("[v0] Submitting product data:", productData)

      const url = product ? `/api/admin/products/${product.id}` : "/api/admin/products"
      const method = product ? "PUT" : "POST"

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(productData),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error("[v0] Product save failed:", errorData)
        throw new Error(errorData.error || `Failed to save product: ${response.status}`)
      }

      const savedProduct = await response.json()
      console.log("[v0] Product saved successfully:", savedProduct.id)

      toast({
        title: product ? "¡Producto actualizado!" : "¡Producto creado!",
        description: `${formData.name} se ha ${product ? "actualizado" : "creado"} exitosamente.`,
        variant: "default",
      })

      onClose(true)
    } catch (error) {
      console.error("[v0] Product form submission error:", error)
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
    <Card className="max-w-2xl mx-auto bg-background border shadow-lg">
      <CardHeader className="bg-gradient-to-r from-rose-50 to-pink-50 border-b">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => onClose(false)} className="hover:bg-gray-100">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <CardTitle className="text-rose-600">{product ? "Editar Producto" : "Nuevo Producto"}</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="p-6 bg-background">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre del Producto</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="focus:ring-2 focus:ring-rose-500"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="brand">Marca</Label>
              <Input
                id="brand"
                value={formData.brand}
                onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                className="focus:ring-2 focus:ring-rose-500"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descripción</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="focus:ring-2 focus:ring-rose-500"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
                className="focus:ring-2 focus:ring-rose-500"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Categoría</Label>
              <div className="flex gap-2">
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData({ ...formData, category: value })}
                >
                  <SelectTrigger className="focus:ring-2 focus:ring-rose-500">
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
                      <DialogDescription id="new-category-description">
                        Crea una nueva categoría para organizar tus productos.
                      </DialogDescription>
                    </DialogHeader>
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
                      const target = e.target as HTMLImageElement
                      target.src = `/placeholder.svg?height=128&width=128&query=preview-${formData.name || "product"}`
                    }}
                    loading="lazy"
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
            <Button type="submit" className="flex-1 bg-rose-500 hover:bg-rose-600" disabled={uploading}>
              {uploading ? "Guardando..." : product ? "Actualizar" : "Crear"} Producto
            </Button>
            <Button type="button" variant="outline" onClick={() => onClose(false)}>
              Cancelar
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
