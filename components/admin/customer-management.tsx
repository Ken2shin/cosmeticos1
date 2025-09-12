"use client"

import type React from "react"
import { toast } from "@/components/ui/use-toast"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Plus,
  Edit,
  Trash2,
  User,
  Mail,
  Phone,
  Calendar,
  Search,
  Filter,
  FileText,
  Download,
  Package,
} from "lucide-react"

interface Customer {
  id: number
  name: string
  email: string
  phone?: string
  address?: string
  total_orders: number
  total_spent: number
  first_purchase_date?: string
  last_purchase_date?: string
  created_at: string
  top_products?: Array<{
    product_name: string
    quantity: number
    total_spent: number
  }>
}

interface Order {
  id: number
  created_at: string
  status: string
  total_amount: number
  items: any[]
}

export function CustomerManagement() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null)
  const [showOrderHistory, setShowOrderHistory] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [customerOrders, setCustomerOrders] = useState<Order[]>([])
  const [loadingOrders, setLoadingOrders] = useState(false)

  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [minSpent, setMinSpent] = useState("")
  const [maxSpent, setMaxSpent] = useState("")
  const [minOrders, setMinOrders] = useState("")

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
  })

  useEffect(() => {
    fetchCustomers()
  }, [])

  useEffect(() => {
    filterCustomers()
  }, [customers, searchTerm, statusFilter, minSpent, maxSpent, minOrders])

  const fetchCustomers = async () => {
    try {
      console.log("[v0] Fetching customers from API...")
      const response = await fetch("/api/customers")

      if (!response.ok) {
        console.error("[v0] Failed to fetch customers:", response.status)
        throw new Error(`HTTP ${response.status}`)
      }

      const data = await response.json()

      console.log("[v0] Raw customers data:", data)
      console.log("[v0] Number of customers fetched:", data.length)

      if (!Array.isArray(data)) {
        console.error("[v0] Invalid data format received:", typeof data)
        setCustomers([])
        return
      }

      const customersWithProducts = await Promise.all(
        data.map(async (customer: Customer) => {
          try {
            const customerIdentifier = customer.email || `${customer.phone}@customer.local`

            const ordersResponse = await fetch(`/api/orders?customer_email=${encodeURIComponent(customerIdentifier)}`)
            if (ordersResponse.ok) {
              const orders = await ordersResponse.json()

              const productSummary: { [key: string]: { quantity: number; total: number } } = {}
              orders.forEach((order: any) => {
                if (order.items && Array.isArray(order.items)) {
                  order.items.forEach((item: any) => {
                    const productName = item.product_name || item.name || "Producto Sin Nombre"
                    const quantity = Number(item.quantity) || 0
                    const totalPrice = Number(item.total_price) || Number(item.price) * quantity || 0

                    if (productSummary[productName]) {
                      productSummary[productName].quantity += quantity
                      productSummary[productName].total += totalPrice
                    } else {
                      productSummary[productName] = {
                        quantity: quantity,
                        total: totalPrice,
                      }
                    }
                  })
                }
              })

              const topProducts = Object.entries(productSummary)
                .map(([product_name, data]) => ({
                  product_name,
                  quantity: data.quantity,
                  total_spent: data.total,
                }))
                .sort((a, b) => b.quantity - a.quantity)
                .slice(0, 3)

              return {
                ...customer,
                top_products: topProducts,
                email: customer.email || customerIdentifier,
              }
            }
          } catch (error) {
            console.error("Error fetching products for customer:", customer.email || customer.phone, error)
          }
          return {
            ...customer,
            top_products: [],
            email: customer.email || `${customer.phone}@customer.local`,
          }
        }),
      )

      console.log("[v0] Processed customers with products:", customersWithProducts)
      console.log("[v0] Setting customers state with", customersWithProducts.length, "customers")

      setCustomers(customersWithProducts)

      toast({
        title: "✅ Clientes cargados",
        description: `Se encontraron ${customersWithProducts.length} clientes en la base de datos`,
        variant: "default",
      })
    } catch (error) {
      console.error("[v0] Error fetching customers:", error)
      toast({
        title: "❌ Error al cargar clientes",
        description: "No se pudieron cargar los clientes. Intenta de nuevo.",
        variant: "destructive",
      })
      setCustomers([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    console.log("[v0] Filtered customers updated:", filteredCustomers.length, "customers")
    console.log("[v0] Current filters - searchTerm:", searchTerm, "statusFilter:", statusFilter)
  }, [filteredCustomers, searchTerm, statusFilter])

  const filterCustomers = () => {
    let filtered = [...customers]

    if (searchTerm) {
      filtered = filtered.filter(
        (customer) =>
          customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          customer.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (customer.phone && customer.phone.includes(searchTerm)),
      )
    }

    if (statusFilter !== "all") {
      if (statusFilter === "active") {
        filtered = filtered.filter((customer) => customer.total_orders > 0)
      } else if (statusFilter === "new") {
        filtered = filtered.filter((customer) => customer.total_orders === 0)
      }
    }

    if (minSpent) {
      filtered = filtered.filter((customer) => customer.total_spent >= Number.parseFloat(minSpent))
    }

    if (maxSpent) {
      filtered = filtered.filter((customer) => customer.total_spent <= Number.parseFloat(maxSpent))
    }

    if (minOrders) {
      filtered = filtered.filter((customer) => customer.total_orders >= Number.parseInt(minOrders))
    }

    setFilteredCustomers(filtered)
  }

  const clearFilters = () => {
    setSearchTerm("")
    setStatusFilter("all")
    setMinSpent("")
    setMaxSpent("")
    setMinOrders("")
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const url = editingCustomer ? `/api/customers/${editingCustomer.id}` : "/api/customers"
      const method = editingCustomer ? "PUT" : "POST"

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        alert(editingCustomer ? "Cliente actualizado exitosamente" : "Cliente creado exitosamente")
        handleCloseForm()
        fetchCustomers()
      } else {
        throw new Error("Error al guardar cliente")
      }
    } catch (error) {
      console.error("Error saving customer:", error)
      alert("Error al guardar cliente")
    }
  }

  const handleEdit = (customer: Customer) => {
    setEditingCustomer(customer)
    setFormData({
      name: customer.name,
      email: customer.email,
      phone: customer.phone || "",
      address: customer.address || "",
    })
    setShowForm(true)
  }

  const handleDelete = async (customerId: number) => {
    if (confirm("¿Estás seguro de que quieres eliminar este cliente?")) {
      try {
        const response = await fetch(`/api/customers/${customerId}`, { method: "DELETE" })

        if (response.ok) {
          alert("Cliente eliminado exitosamente")
          fetchCustomers()
        } else {
          throw new Error("Error al eliminar cliente")
        }
      } catch (error) {
        console.error("Error deleting customer:", error)
        alert("Error al eliminar cliente")
      }
    }
  }

  const handleCloseForm = () => {
    setShowForm(false)
    setEditingCustomer(null)
    setFormData({ name: "", email: "", phone: "", address: "" })
  }

  const fetchCustomerOrders = async (customerEmail: string) => {
    setLoadingOrders(true)
    try {
      const response = await fetch(`/api/orders?customer_email=${encodeURIComponent(customerEmail)}`)
      if (response.ok) {
        const orders = await response.json()
        setCustomerOrders(orders)
      } else {
        setCustomerOrders([])
      }
    } catch (error) {
      console.error("Error fetching customer orders:", error)
      setCustomerOrders([])
    } finally {
      setLoadingOrders(false)
    }
  }

  const handleShowOrderHistory = (customer: Customer) => {
    setSelectedCustomer(customer)
    setShowOrderHistory(true)
    fetchCustomerOrders(customer.email)
  }

  const generateCustomerReport = async (customer: Customer) => {
    try {
      let jsPDF: any
      try {
        const jsPDFModule = await import("jspdf")
        jsPDF = jsPDFModule.jsPDF || jsPDFModule.default
      } catch (importError) {
        console.error("Error importing jsPDF:", importError)
        alert("Error: No se pudo cargar la librería PDF. Por favor, recarga la página e intenta de nuevo.")
        return
      }

      const response = await fetch(`/api/orders?customer_email=${encodeURIComponent(customer.email)}`)
      if (!response.ok) {
        throw new Error("Failed to fetch customer orders")
      }

      const orders = await response.json()

      const doc = new jsPDF()

      doc.setFont("helvetica")

      doc.setFontSize(24)
      doc.setTextColor(233, 30, 99)
      doc.text("Beauty Catalog", 20, 30)

      doc.setFontSize(12)
      doc.setTextColor(100, 100, 100)
      doc.text("Reporte Completo de Cliente", 20, 40)

      doc.setFontSize(20)
      doc.setTextColor(0, 0, 0)
      doc.text(`REPORTE DE CLIENTE`, 20, 60)

      doc.setFontSize(14)
      doc.setTextColor(233, 30, 99)
      doc.text("Información del Cliente", 20, 80)

      doc.setFontSize(10)
      doc.setTextColor(0, 0, 0)
      doc.text(`Nombre: ${customer.name}`, 20, 95)
      doc.text(`Email: ${customer.email}`, 20, 105)
      if (customer.phone) {
        doc.text(`Teléfono: ${customer.phone}`, 20, 115)
      }
      if (customer.address) {
        doc.text(`Dirección: ${customer.address}`, 20, 125)
      }

      doc.setFontSize(14)
      doc.setTextColor(233, 30, 99)
      doc.text("Estadísticas de Compras", 120, 80)

      doc.setFontSize(10)
      doc.setTextColor(0, 0, 0)
      doc.text(`Total de Pedidos: ${customer.total_orders}`, 120, 95)
      doc.text(`Total Gastado: C$${Number(customer.total_spent).toFixed(2)}`, 120, 105)
      if (customer.first_purchase_date) {
        doc.text(`Primera Compra: ${new Date(customer.first_purchase_date).toLocaleDateString("es-ES")}`, 120, 115)
      }
      if (customer.last_purchase_date) {
        doc.text(`Última Compra: ${new Date(customer.last_purchase_date).toLocaleDateString("es-ES")}`, 120, 125)
      }

      const completedOrders = orders.filter((order: any) => order.status === "completed")
      const averageOrderValue = completedOrders.length > 0 ? customer.total_spent / completedOrders.length : 0

      doc.text(`Valor Promedio por Pedido: C$${averageOrderValue.toFixed(2)}`, 120, 135)

      let yPos = 160
      doc.setFontSize(12)
      doc.setTextColor(233, 30, 99)
      doc.text("Historial de Pedidos", 20, yPos)

      if (orders.length > 0) {
        yPos += 15
        doc.setFontSize(9)
        doc.setTextColor(0, 0, 0)
        doc.text("Pedido #", 20, yPos)
        doc.text("Fecha", 50, yPos)
        doc.text("Estado", 90, yPos)
        doc.text("Productos", 120, yPos)
        doc.text("Total", 170, yPos)

        doc.line(20, yPos + 2, 190, yPos + 2)

        yPos += 10
        orders.forEach((order: any) => {
          if (yPos > 250) {
            doc.addPage()
            yPos = 30
          }

          doc.text(`#${order.id}`, 20, yPos)
          doc.text(new Date(order.created_at).toLocaleDateString("es-ES"), 50, yPos)
          const statusText =
            order.status === "pending" ? "Pendiente" : order.status === "completed" ? "Completado" : "Cancelado"
          doc.text(statusText, 90, yPos)
          doc.text(`${order.items?.length || 0} items`, 120, yPos)
          doc.text(`C$${Number(order.total_amount).toFixed(2)}`, 170, yPos)
          yPos += 8
        })

        yPos += 15
        if (yPos > 240) {
          doc.addPage()
          yPos = 30
        }

        doc.setFontSize(12)
        doc.setTextColor(233, 30, 99)
        doc.text("Resumen de Productos Comprados", 20, yPos)

        yPos += 15
        doc.setFontSize(9)
        doc.setTextColor(0, 0, 0)
        doc.text("Producto", 20, yPos)
        doc.text("Marca", 80, yPos)
        doc.text("Cantidad", 120, yPos)
        doc.text("Total Gastado", 160, yPos)

        doc.line(20, yPos + 2, 190, yPos + 2)

        yPos += 10
        const productSummary: { [key: string]: { quantity: number; total: number; brand?: string } } = {}
        orders.forEach((order: any) => {
          if (order.items) {
            order.items.forEach((item: any) => {
              const productName = item.product_name || "Producto"
              if (productSummary[productName]) {
                productSummary[productName].quantity += item.quantity
                productSummary[productName].total += Number(item.total_price)
              } else {
                productSummary[productName] = {
                  quantity: item.quantity,
                  total: Number(item.total_price),
                  brand: item.product_brand,
                }
              }
            })
          }
        })

        Object.entries(productSummary).forEach(([productName, data]) => {
          if (yPos > 250) {
            doc.addPage()
            yPos = 30
          }

          doc.text(productName.substring(0, 25), 20, yPos)
          doc.text(data.brand || "-", 80, yPos)
          doc.text(data.quantity.toString(), 120, yPos)
          doc.text(`C$${data.total.toFixed(2)}`, 160, yPos)
          yPos += 8
        })
      } else {
        yPos += 15
        doc.setFontSize(10)
        doc.setTextColor(100, 100, 100)
        doc.text("Este cliente no tiene pedidos registrados", 20, yPos)
      }

      yPos += 30
      if (yPos > 250) {
        doc.addPage()
        yPos = 30
      }
      doc.setFontSize(10)
      doc.setTextColor(100, 100, 100)
      doc.text("Beauty Catalog - Reporte de Cliente", 20, yPos)
      doc.text(`Reporte generado el ${new Date().toLocaleDateString("es-ES")}`, 20, yPos + 10)

      doc.save(`reporte-cliente-${customer.name.replace(/\s+/g, "-")}.pdf`)
    } catch (error) {
      console.error("Error generating customer report:", error)
      alert("Error al generar el reporte del cliente")
    }
  }

  const handleGenerateInvoice = async (orderId: number) => {
    try {
      let jsPDF: any
      try {
        const jsPDFModule = await import("jspdf")
        jsPDF = jsPDFModule.jsPDF || jsPDFModule.default
      } catch (importError) {
        console.error("Error importing jsPDF:", importError)
        alert("Error: No se pudo cargar la librería PDF. Por favor, recarga la página e intenta de nuevo.")
        return
      }

      const response = await fetch(`/api/orders/${orderId}`)
      if (!response.ok) {
        throw new Error("Failed to fetch order data")
      }

      const order = await response.json()

      const doc = new jsPDF()

      doc.setFont("helvetica")

      doc.setFontSize(24)
      doc.setTextColor(233, 30, 99)
      doc.text("Beauty Catalog", 20, 30)

      doc.setFontSize(12)
      doc.setTextColor(100, 100, 100)
      doc.text("Catálogo de Productos de Belleza", 20, 40)

      doc.setFontSize(20)
      doc.setTextColor(0, 0, 0)
      doc.text(`FACTURA #${order.id}`, 20, 60)

      doc.setFontSize(14)
      doc.setTextColor(233, 30, 99)
      doc.text("Información del Cliente", 20, 80)

      doc.setFontSize(10)
      doc.setTextColor(0, 0, 0)
      doc.text(`Nombre: ${order.customer_name}`, 20, 95)
      doc.text(`Email: ${order.customer_email}`, 20, 105)
      if (order.customer_phone) {
        doc.text(`Teléfono: ${order.customer_phone}`, 20, 115)
      }

      doc.setFontSize(14)
      doc.setTextColor(233, 30, 99)
      doc.text("Información del Pedido", 120, 80)

      doc.setFontSize(10)
      doc.setTextColor(0, 0, 0)
      doc.text(
        `Fecha: ${new Date(order.created_at).toLocaleDateString("es-ES", {
          year: "numeric",
          month: "long",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })}`,
        120,
        95,
      )
      const statusText =
        order.status === "pending" ? "Pendiente" : order.status === "completed" ? "Completado" : "Cancelado"
      doc.text(`Estado: ${statusText}`, 120, 105)

      let yPos = 140
      doc.setFontSize(12)
      doc.setTextColor(233, 30, 99)
      doc.text("Productos", 20, yPos)

      yPos += 15
      doc.setFontSize(9)
      doc.setTextColor(0, 0, 0)
      doc.text("Producto", 20, yPos)
      doc.text("Marca", 80, yPos)
      doc.text("Cant.", 120, yPos)
      doc.text("Precio Unit.", 140, yPos)
      doc.text("Total", 170, yPos)

      doc.line(20, yPos + 2, 190, yPos + 2)

      yPos += 10
      if (order.items && order.items.length > 0) {
        order.items.forEach((item: any, index: number) => {
          if (yPos > 250) {
            doc.addPage()
            yPos = 30
          }

          doc.text((item.product_name || "Producto").substring(0, 25), 20, yPos)
          doc.text(item.product_brand || "-", 80, yPos)
          doc.text(item.quantity.toString(), 120, yPos)
          doc.text(`C$${Number(item.unit_price).toFixed(2)}`, 140, yPos)
          doc.text(`C$${Number(item.total_price).toFixed(2)}`, 170, yPos)
          yPos += 10
        })
      }

      yPos += 10
      doc.line(20, yPos, 190, yPos)
      yPos += 15
      doc.setFontSize(16)
      doc.setTextColor(233, 30, 99)
      doc.text(`TOTAL: C$${Number(order.total_amount).toFixed(2)}`, 120, yPos)

      yPos += 30
      doc.setFontSize(10)
      doc.setTextColor(100, 100, 100)
      doc.text("Gracias por su compra en Beauty Catalog", 20, yPos)
      doc.text(`Factura generada el ${new Date().toLocaleDateString("es-ES")}`, 20, yPos + 10)

      doc.save(`factura-${order.id}.pdf`)
    } catch (error) {
      console.error("Error generating PDF invoice:", error)
      alert("Error al generar la factura PDF")
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold bg-gradient-to-r from-rose-600 to-pink-600 bg-clip-text text-transparent">
          Gestión de Clientes
        </h2>
        <Button
          onClick={() => setShowForm(true)}
          className="bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 transition-all duration-300 transform hover:scale-105"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nuevo Cliente
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filtros de Búsqueda de Clientes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            <div className="space-y-2">
              <Label htmlFor="search">Buscar Cliente</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  id="search"
                  placeholder="Nombre, email, teléfono..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Estado del Cliente</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos los clientes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los clientes</SelectItem>
                  <SelectItem value="active">Clientes activos</SelectItem>
                  <SelectItem value="new">Clientes nuevos</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="minSpent">Gasto Mínimo</Label>
              <Input
                id="minSpent"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={minSpent}
                onChange={(e) => setMinSpent(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="maxSpent">Gasto Máximo</Label>
              <Input
                id="maxSpent"
                type="number"
                step="0.01"
                placeholder="999999.99"
                value={maxSpent}
                onChange={(e) => setMaxSpent(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="minOrders">Pedidos Mínimos</Label>
              <Input
                id="minOrders"
                type="number"
                placeholder="0"
                value={minOrders}
                onChange={(e) => setMinOrders(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>&nbsp;</Label>
              <Button onClick={clearFilters} variant="outline" className="w-full bg-transparent">
                Limpiar Filtros
              </Button>
            </div>
          </div>

          <div className="mt-4 text-sm text-muted-foreground">
            Mostrando {filteredCustomers.length} de {customers.length} clientes
          </div>
        </CardContent>
      </Card>

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
          {filteredCustomers.map((customer) => (
            <Card key={customer.id} className="group hover:shadow-lg transition-all duration-300 hover:scale-[1.02]">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg line-clamp-2 group-hover:text-rose-600 transition-colors flex items-center gap-2">
                    <User className="w-4 h-4" />
                    {customer.name}
                  </CardTitle>
                  <Badge variant={customer.total_orders > 0 ? "default" : "secondary"}>
                    {customer.total_orders > 0 ? "Activo" : "Nuevo"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Mail className="w-4 h-4" />
                  {customer.email}
                </div>

                {customer.phone && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Phone className="w-4 h-4" />
                    {customer.phone}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div className="text-center">
                    <div className="text-lg font-bold text-rose-600">{customer.total_orders}</div>
                    <div className="text-xs text-muted-foreground">Pedidos</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-green-600">C${Number(customer.total_spent).toFixed(2)}</div>
                    <div className="text-xs text-muted-foreground">Gastado</div>
                  </div>
                </div>

                {customer.top_products && customer.top_products.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                      <Package className="w-4 h-4" />
                      Productos Favoritos:
                    </div>
                    <div className="space-y-1">
                      {customer.top_products.slice(0, 2).map((product, index) => (
                        <div key={index} className="text-xs bg-rose-50 p-2 rounded flex justify-between items-center">
                          <span className="font-medium text-rose-700 truncate">{product.product_name}</span>
                          <span className="text-rose-600 font-semibold">{product.quantity}x</span>
                        </div>
                      ))}
                      {customer.top_products.length > 2 && (
                        <div className="text-xs text-muted-foreground text-center">
                          +{customer.top_products.length - 2} productos más
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {customer.last_purchase_date && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Calendar className="w-3 h-3" />
                    Última compra: {new Date(customer.last_purchase_date).toLocaleDateString()}
                  </div>
                )}

                <div className="flex gap-1 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(customer)}
                    className="flex-1 hover:bg-rose-50 hover:border-rose-300 transition-colors"
                  >
                    <Edit className="w-3 h-3 mr-1" />
                    Editar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleShowOrderHistory(customer)}
                    className="flex-1 hover:bg-blue-50 hover:border-blue-300 transition-colors"
                  >
                    Ver Pedidos
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => generateCustomerReport(customer)}
                    className="flex-1 hover:bg-green-50 hover:border-green-300 transition-colors"
                  >
                    <FileText className="w-3 h-3 mr-1" />
                    Reporte
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(customer.id)}
                    className="text-destructive hover:text-destructive hover:bg-red-50 hover:border-red-300 transition-colors"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!loading && filteredCustomers.length === 0 && customers.length > 0 && (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gradient-to-br from-rose-100 to-pink-100 rounded-full flex items-center justify-center mb-4 mx-auto">
            <Search className="h-8 w-8 text-rose-500" />
          </div>
          <h3 className="text-lg font-semibold mb-2">No se encontraron clientes</h3>
          <p className="text-muted-foreground mb-4">
            Intenta ajustar los filtros de búsqueda para encontrar los clientes que buscas
          </p>
          <Button onClick={clearFilters} variant="outline">
            Limpiar Filtros
          </Button>
        </div>
      )}

      {!loading && customers.length === 0 && (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gradient-to-br from-rose-100 to-pink-100 rounded-full flex items-center justify-center mb-4 mx-auto">
            <User className="h-8 w-8 text-rose-500" />
          </div>
          <h3 className="text-lg font-semibold mb-2">No hay clientes registrados</h3>
          <p className="text-muted-foreground mb-4">Los clientes se registrarán automáticamente al hacer pedidos</p>
        </div>
      )}

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCustomer ? "Editar Cliente" : "Nuevo Cliente"}</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">Nombre *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="phone">Teléfono</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="address">Dirección</Label>
              <Textarea
                id="address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                rows={3}
              />
            </div>

            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={handleCloseForm}>
                Cancelar
              </Button>
              <Button type="submit">{editingCustomer ? "Actualizar" : "Crear"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={showOrderHistory} onOpenChange={setShowOrderHistory}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Historial de Pedidos - {selectedCustomer?.name}</span>
              {selectedCustomer && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => generateCustomerReport(selectedCustomer)}
                  className="hover:bg-green-50 hover:border-green-300"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Reporte Completo
                </Button>
              )}
            </DialogTitle>
          </DialogHeader>

          {loadingOrders ? (
            <div className="flex justify-center py-8">
              <div className="w-8 h-8 border-2 border-rose-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : customerOrders.length > 0 ? (
            <div className="space-y-4">
              {customerOrders.map((order) => (
                <Card key={order.id} className="border border-gray-200">
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">Pedido #{order.id}</CardTitle>
                        <p className="text-sm text-muted-foreground">
                          {new Date(order.created_at).toLocaleDateString("es-ES", {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                      <div className="text-right">
                        <Badge variant={order.status === "completed" ? "default" : "secondary"}>
                          {order.status === "pending"
                            ? "Pendiente"
                            : order.status === "completed"
                              ? "Completado"
                              : "Cancelado"}
                        </Badge>
                        <p className="text-lg font-bold text-green-600 mt-1">
                          C${Number(order.total_amount).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <h4 className="font-semibold text-sm">Productos:</h4>
                      {order.items && order.items.length > 0 ? (
                        <div className="space-y-1">
                          {order.items.map((item: any, index: number) => (
                            <div key={index} className="flex justify-between text-sm bg-gray-50 p-2 rounded">
                              <span>{item.product_name || "Producto"}</span>
                              <span>
                                {item.quantity}x C${Number(item.unit_price).toFixed(2)} = C$
                                {Number(item.total_price).toFixed(2)}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">No hay productos en este pedido</p>
                      )}
                    </div>
                    <div className="flex gap-2 mt-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleGenerateInvoice(order.id)}
                        className="hover:bg-green-50 hover:border-green-300"
                      >
                        Descargar PDF
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Este cliente no tiene pedidos registrados</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
