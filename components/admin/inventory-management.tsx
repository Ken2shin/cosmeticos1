"use client"

import type React from "react"
import { toast } from "@/components/ui/use-toast"

import { useState, useEffect, useCallback, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Edit, Trash2, Package, Calendar, X } from "lucide-react"

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

  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 6 // Reduced from showing all items

  useEffect(() => {
    fetchInventory()
    fetchProducts()
  }, [])

  const memoizedProducts = useMemo(() => products, [products])

  const paginatedInventory = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    return inventory.slice(startIndex, startIndex + itemsPerPage)
  }, [inventory, currentPage])

  const totalPages = Math.ceil(inventory.length / itemsPerPage)

  const fetchInventory = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/inventory")
      if (response.ok) {
        const data = await response.json()
        setInventory(Array.isArray(data) ? data : [])
      } else {
        throw new Error(`HTTP ${response.status}: Error fetching inventory`)
      }
    } catch (error) {
      console.error("Error al cargar inventario:", error)
      toast({
        title: "Error de conexión",
        description: "No se pudo cargar el inventario. Verifica tu conexión.",
        variant: "destructive",
      })
      setInventory([])
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchProducts = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/products", {
        cache: "no-store",
        headers: {
          "Cache-Control": "no-cache",
        },
      })

      if (response.ok) {
        const data = await response.json()
        const productsArray = Array.isArray(data) ? data : []
        setProducts(productsArray)
      } else {
        throw new Error(`HTTP ${response.status}: Error fetching products`)
      }
    } catch (error) {
      console.error("Error al cargar productos:", error)
      toast({
        title: "Error de productos",
        description: "No se pudieron cargar los productos disponibles.",
        variant: "destructive",
      })
      setProducts([])
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      if (formData.product_id === "no-products-available") {
        toast({
          title: "Sin productos",
          description: "No hay productos disponibles para crear un registro de inventario.",
          variant: "destructive",
        })
        return
      }

      if (!formData.product_id || !formData.purchase_price || !formData.purchase_quantity) {
        toast({
          title: "Campos requeridos",
          description: "Por favor completa todos los campos obligatorios.",
          variant: "destructive",
        })
        return
      }

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
        toast({
          title: editingRecord ? "Registro actualizado" : "Registro creado",
          description: editingRecord ? "El registro se actualizó exitosamente" : "El registro se creó exitosamente",
          variant: "default",
        })

        handleCloseForm()
        await fetchInventory()
      } else {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || "Error al guardar registro")
      }
    } catch (error) {
      console.error("Error al guardar registro de inventario:", error)
      toast({
        title: "Error al guardar",
        description: error instanceof Error ? error.message : "Ocurrió un error al registrar la compra.",
        variant: "destructive",
      })
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
          toast({
            title: "Registro eliminado",
            description: "El registro se eliminó exitosamente",
            variant: "default",
          })
          await fetchInventory()
        } else {
          throw new Error("Error al eliminar registro")
        }
      } catch (error) {
        console.error("Error al eliminar registro:", error)
        toast({
          title: "Error al eliminar",
          description: "No se pudo eliminar el registro. Intenta nuevamente.",
          variant: "destructive",
        })
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
        <h2 className="text-2xl font-bold text-rose-600">Gestión de Inventario</h2>
        <Button onClick={() => setShowForm(true)} className="bg-rose-500 hover:bg-rose-600">
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
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {paginatedInventory.map((record) => (
              <Card key={record.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-lg flex items-center gap-2">
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
                    <Button variant="outline" size="sm" onClick={() => handleEdit(record)} className="flex-1">
                      <Edit className="w-4 h-4 mr-1" />
                      Editar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(record.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-2 mt-6">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
              >
                Anterior
              </Button>
              <span className="text-sm text-muted-foreground">
                Página {currentPage} de {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
              >
                Siguiente
              </Button>
            </div>
          )}
        </>
      )}

      {!loading && inventory.length === 0 && (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center mb-4 mx-auto">
            <Package className="h-8 w-8 text-rose-500" />
          </div>
          <h3 className="text-lg font-semibold mb-2">No hay registros de inventario</h3>
          <p className="text-muted-foreground mb-4">Comienza registrando tus compras de productos</p>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={handleCloseForm} />

          <div className="relative bg-background rounded-lg border shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="bg-rose-50 p-6 border-b">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-semibold">
                    {editingRecord ? "Editar Registro de Inventario" : "Nueva Compra de Inventario"}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {editingRecord
                      ? "Actualiza la información del registro de inventario seleccionado."
                      : "Registra una nueva compra de productos para el inventario."}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCloseForm}
                  className="h-8 w-8 p-0"
                  aria-label="Cerrar formulario"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="p-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="inventory-product">Producto *</Label>
                  <Select
                    value={formData.product_id}
                    onValueChange={(value) => setFormData({ ...formData, product_id: value })}
                    required
                  >
                    <SelectTrigger id="inventory-product">
                      <SelectValue placeholder="Seleccionar producto" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.isArray(memoizedProducts) && memoizedProducts.length > 0 ? (
                        memoizedProducts.map((product) => (
                          <SelectItem key={`product-${product.id}`} value={product.id.toString()}>
                            {product.name} {product.brand && `- ${product.brand}`}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="no-products-available" disabled>
                          {Array.isArray(memoizedProducts) && memoizedProducts.length === 0
                            ? "No hay productos disponibles"
                            : "Cargando productos..."}
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="inventory-purchase-price">Precio de Compra *</Label>
                    <Input
                      id="inventory-purchase-price"
                      name="purchase_price"
                      type="number"
                      step="0.01"
                      value={formData.purchase_price}
                      onChange={(e) => setFormData({ ...formData, purchase_price: e.target.value })}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="inventory-purchase-quantity">Cantidad *</Label>
                    <Input
                      id="inventory-purchase-quantity"
                      name="purchase_quantity"
                      type="number"
                      value={formData.purchase_quantity}
                      onChange={(e) => setFormData({ ...formData, purchase_quantity: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="inventory-current-stock">Stock Actual *</Label>
                  <Input
                    id="inventory-current-stock"
                    name="current_stock"
                    type="number"
                    value={formData.current_stock}
                    onChange={(e) => setFormData({ ...formData, current_stock: e.target.value })}
                    placeholder="Cantidad de piezas disponibles"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="inventory-supplier-name">Proveedor</Label>
                  <Input
                    id="inventory-supplier-name"
                    name="supplier_name"
                    value={formData.supplier_name}
                    onChange={(e) => setFormData({ ...formData, supplier_name: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="inventory-supplier-contact">Contacto del Proveedor</Label>
                  <Input
                    id="inventory-supplier-contact"
                    name="supplier_contact"
                    value={formData.supplier_contact}
                    onChange={(e) => setFormData({ ...formData, supplier_contact: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="inventory-notes">Notas</Label>
                  <Textarea
                    id="inventory-notes"
                    name="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={3}
                  />
                </div>

                <div className="flex gap-2 justify-end pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCloseForm}
                    aria-label="Cancelar registro de inventario"
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    aria-label={editingRecord ? "Actualizar registro de inventario" : "Registrar nueva compra"}
                  >
                    {editingRecord ? "Actualizar" : "Registrar Compra"}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
