"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Edit, Trash2, Package, Calendar } from "lucide-react"

interface InventoryRecord {
  id: number
  product_id: number
  product_name: string
  product_brand?: string
  purchase_price: number
  purchase_quantity: number
  purchase_date: string
  supplier_name?: string
  supplier_contact?: string
  notes?: string
  selling_price: number
  current_stock: number
  profit_per_unit: number
  profit_margin_percent: number
}

interface Product {
  id: number
  name: string
  brand?: string
}

export function InventoryManagement() {
  const [inventory, setInventory] = useState<InventoryRecord[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingRecord, setEditingRecord] = useState<InventoryRecord | null>(null)
  const [formData, setFormData] = useState({
    product_id: "",
    purchase_price: "",
    purchase_quantity: "",
    current_stock: "",
    supplier_name: "",
    supplier_contact: "",
    notes: "",
  })

  useEffect(() => {
    fetchInventory()
    fetchProducts()
  }, [])

  const fetchInventory = async () => {
    try {
      const response = await fetch("/api/inventory")
      if (response.ok) {
        const data = await response.json()
        setInventory(Array.isArray(data) ? data : [])
      } else {
        console.error("Error fetching inventory: HTTP", response.status)
        setInventory([])
      }
    } catch (error) {
      console.error("Error fetching inventory:", error)
      setInventory([])
    } finally {
      setLoading(false)
    }
  }

  const fetchProducts = async () => {
    try {
      console.log("[v0] Fetching products for inventory selection")
      const response = await fetch("/api/products")
      if (response.ok) {
        const data = await response.json()
        console.log("[v0] Products fetched successfully:", data.length, "products")
        setProducts(Array.isArray(data) ? data : [])
      } else {
        console.error("[v0] Error fetching products: HTTP", response.status)
        const errorText = await response.text()
        console.error("[v0] Error details:", errorText)
        setProducts([])
      }
    } catch (error) {
      console.error("[v0] Error fetching products:", error)
      setProducts([])
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const url = editingRecord ? `/api/inventory/${editingRecord.id}` : "/api/inventory"
      const method = editingRecord ? "PUT" : "POST"

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          product_id: Number.parseInt(formData.product_id),
          purchase_price: Number.parseFloat(formData.purchase_price),
          purchase_quantity: Number.parseInt(formData.purchase_quantity),
          current_stock: Number.parseInt(formData.current_stock),
        }),
      })

      if (response.ok) {
        alert(editingRecord ? "Registro actualizado exitosamente" : "Registro creado exitosamente")
        handleCloseForm()
        fetchInventory()
      } else {
        throw new Error("Error al guardar registro")
      }
    } catch (error) {
      console.error("Error saving inventory record:", error)
      alert("Error al guardar registro")
    }
  }

  const handleEdit = (record: InventoryRecord) => {
    setEditingRecord(record)
    setFormData({
      product_id: record.product_id.toString(),
      purchase_price: record.purchase_price.toString(),
      purchase_quantity: record.purchase_quantity.toString(),
      current_stock: record.current_stock.toString(),
      supplier_name: record.supplier_name || "",
      supplier_contact: record.supplier_contact || "",
      notes: record.notes || "",
    })
    setShowForm(true)
  }

  const handleDelete = async (recordId: number) => {
    if (confirm("¿Estás seguro de que quieres eliminar este registro?")) {
      try {
        const response = await fetch(`/api/inventory/${recordId}`, { method: "DELETE" })

        if (response.ok) {
          alert("Registro eliminado exitosamente")
          fetchInventory()
        } else {
          throw new Error("Error al eliminar registro")
        }
      } catch (error) {
        console.error("Error deleting inventory record:", error)
        alert("Error al eliminar registro")
      }
    }
  }

  const handleCloseForm = () => {
    setShowForm(false)
    setEditingRecord(null)
    setFormData({
      product_id: "",
      purchase_price: "",
      purchase_quantity: "",
      current_stock: "",
      supplier_name: "",
      supplier_contact: "",
      notes: "",
    })
  }

  const getProfitColor = (margin: number) => {
    if (margin >= 50) return "text-green-600"
    if (margin >= 25) return "text-yellow-600"
    return "text-red-600"
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold bg-gradient-to-r from-rose-600 to-pink-600 bg-clip-text text-transparent">
          Gestión de Inventario
        </h2>
        <Button
          onClick={() => setShowForm(true)}
          className="bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 transition-all duration-300 transform hover:scale-105"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nueva Compra
        </Button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="h-3 bg-gray-200 rounded w-full mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-2/3"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {inventory.map((record) => (
            <Card key={record.id} className="group hover:shadow-lg transition-all duration-300 hover:scale-[1.02]">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg line-clamp-2 group-hover:text-rose-600 transition-colors flex items-center gap-2">
                    <Package className="w-4 h-4" />
                    {record.product_name}
                  </CardTitle>
                  <Badge variant="outline">Stock: {record.current_stock}</Badge>
                </div>
                {record.product_brand && <p className="text-sm text-muted-foreground">{record.product_brand}</p>}
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-muted-foreground">Costo</div>
                    <div className="text-lg font-bold text-red-600">C${record.purchase_price}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Venta</div>
                    <div className="text-lg font-bold text-green-600">C${record.selling_price}</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-muted-foreground">Ganancia/Unidad</div>
                    <div className="text-sm font-semibold text-green-600">C${record.profit_per_unit}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Margen</div>
                    <div className={`text-sm font-semibold ${getProfitColor(record.profit_margin_percent || 0)}`}>
                      {typeof record.profit_margin_percent === "number"
                        ? record.profit_margin_percent.toFixed(1)
                        : "0.0"}
                      %
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Calendar className="w-3 h-3" />
                  Comprado: {new Date(record.purchase_date).toLocaleDateString()}
                </div>

                {record.supplier_name && (
                  <div className="text-xs text-muted-foreground">Proveedor: {record.supplier_name}</div>
                )}

                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(record)}
                    className="flex-1 hover:bg-rose-50 hover:border-rose-300 transition-colors"
                  >
                    <Edit className="w-4 h-4 mr-1" />
                    Editar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(record.id)}
                    className="text-destructive hover:text-destructive hover:bg-red-50 hover:border-red-300 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!loading && inventory.length === 0 && (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gradient-to-br from-rose-100 to-pink-100 rounded-full flex items-center justify-center mb-4 mx-auto">
            <Package className="h-8 w-8 text-rose-500" />
          </div>
          <h3 className="text-lg font-semibold mb-2">No hay registros de inventario</h3>
          <p className="text-muted-foreground mb-4">Comienza registrando tus compras de productos</p>
        </div>
      )}

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingRecord ? "Editar Registro de Inventario" : "Nueva Compra de Inventario"}</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="product_id">Producto *</Label>
              <Select
                value={formData.product_id}
                onValueChange={(value) => setFormData({ ...formData, product_id: value })}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar producto" />
                </SelectTrigger>
                <SelectContent>
                  {Array.isArray(products) && products.length > 0 ? (
                    products.map((product) => (
                      <SelectItem key={product.id} value={product.id.toString()}>
                        {product.name} {product.brand && `- ${product.brand}`}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="" disabled>
                      {products.length === 0 ? "No hay productos disponibles" : "Cargando productos..."}
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="purchase_price">Precio de Compra *</Label>
                <Input
                  id="purchase_price"
                  type="number"
                  step="0.01"
                  value={formData.purchase_price}
                  onChange={(e) => setFormData({ ...formData, purchase_price: e.target.value })}
                  required
                />
              </div>

              <div>
                <Label htmlFor="purchase_quantity">Cantidad *</Label>
                <Input
                  id="purchase_quantity"
                  type="number"
                  value={formData.purchase_quantity}
                  onChange={(e) => setFormData({ ...formData, purchase_quantity: e.target.value })}
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="current_stock">Stock Actual *</Label>
              <Input
                id="current_stock"
                type="number"
                value={formData.current_stock}
                onChange={(e) => setFormData({ ...formData, current_stock: e.target.value })}
                placeholder="Cantidad de piezas disponibles"
                required
              />
            </div>

            <div>
              <Label htmlFor="supplier_name">Proveedor</Label>
              <Input
                id="supplier_name"
                value={formData.supplier_name}
                onChange={(e) => setFormData({ ...formData, supplier_name: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="supplier_contact">Contacto del Proveedor</Label>
              <Input
                id="supplier_contact"
                value={formData.supplier_contact}
                onChange={(e) => setFormData({ ...formData, supplier_contact: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="notes">Notas</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
              />
            </div>

            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={handleCloseForm}>
                Cancelar
              </Button>
              <Button type="submit">{editingRecord ? "Actualizar" : "Registrar Compra"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
