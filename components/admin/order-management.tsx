"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import {
  Eye,
  FileText,
  Package,
  User,
  Calendar,
  DollarSign,
  Trash2,
  Download,
  Search,
  Filter,
  Edit,
} from "lucide-react"

interface Order {
  id: number
  customer_name: string
  customer_email: string
  customer_phone?: string
  total_amount: number
  status: string
  created_at: string
  items?: OrderItem[]
}

interface OrderItem {
  id: number
  product_name: string
  product_brand?: string
  quantity: number
  unit_price: number
  total_price: number
}

export function OrderManagement() {
  const { toast } = useToast()
  const [orders, setOrders] = useState<Order[]>([])
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [showDetails, setShowDetails] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null)
  const [statusDialog, setStatusDialog] = useState<{ orderId: number; currentStatus: string } | null>(null)
  const [newStatus, setNewStatus] = useState("")
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [dateFilter, setDateFilter] = useState("")
  const [minAmount, setMinAmount] = useState("")
  const [maxAmount, setMaxAmount] = useState("")

  useEffect(() => {
    fetchOrders()
  }, [])

  useEffect(() => {
    filterOrders()
  }, [orders, searchTerm, statusFilter, dateFilter, minAmount, maxAmount])

  const fetchOrders = async () => {
    try {
      const response = await fetch("/api/orders")
      const data = await response.json()
      setOrders(data)
    } catch (error) {
      console.error("Error fetching orders:", error)
    } finally {
      setLoading(false)
    }
  }

  const filterOrders = () => {
    let filtered = [...orders]

    if (searchTerm) {
      filtered = filtered.filter(
        (order) =>
          order.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          order.customer_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
          order.id.toString().includes(searchTerm) ||
          (order.customer_phone && order.customer_phone.includes(searchTerm)),
      )
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((order) => order.status === statusFilter)
    }

    if (dateFilter) {
      filtered = filtered.filter((order) => {
        const orderDate = new Date(order.created_at).toISOString().split("T")[0]
        return orderDate === dateFilter
      })
    }

    if (minAmount) {
      filtered = filtered.filter((order) => order.total_amount >= Number.parseFloat(minAmount))
    }

    if (maxAmount) {
      filtered = filtered.filter((order) => order.total_amount <= Number.parseFloat(maxAmount))
    }

    setFilteredOrders(filtered)
  }

  const clearFilters = () => {
    setSearchTerm("")
    setStatusFilter("all")
    setDateFilter("")
    setMinAmount("")
    setMaxAmount("")
  }

  const fetchOrderDetails = async (orderId: number) => {
    try {
      const response = await fetch(`/api/orders/${orderId}`)
      if (response.ok) {
        const orderDetails = await response.json()
        setSelectedOrder(orderDetails)
        setShowDetails(true)
      }
    } catch (error) {
      console.error("Error fetching order details:", error)
    }
  }

  const generateInvoice = async (orderId: number) => {
    try {
      console.log("[v0] Starting PDF generation for order:", orderId)

      const orderCheckResponse = await fetch(`/api/orders/${orderId}`)
      if (!orderCheckResponse.ok) {
        throw new Error(`Pedido no encontrado (${orderCheckResponse.status})`)
      }

      const orderData = await orderCheckResponse.json()
      console.log("[v0] Order data retrieved:", orderData)

      let jsPDF: any
      try {
        console.log("[v0] Loading jsPDF library...")
        const jsPDFModule = await import("jspdf")
        jsPDF = jsPDFModule.jsPDF || jsPDFModule.default

        if (!jsPDF) {
          throw new Error("jsPDF no se cargó correctamente")
        }
        console.log("[v0] jsPDF loaded successfully")
      } catch (importError) {
        console.error("[v0] Error importing jsPDF:", importError)
        toast({
          title: "Error de PDF",
          description: "No se pudo cargar la librería PDF. Por favor, recarga la página e intenta de nuevo.",
          variant: "destructive",
        })
        return
      }

      const order = orderData

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
      doc.text(`Fecha: ${new Date(order.created_at).toLocaleDateString("es-ES")}`, 120, 95)
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
        order.items.forEach((item: any) => {
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

      console.log("[v0] Saving PDF...")
      doc.save(`factura-${order.id}.pdf`)
      console.log("[v0] PDF saved successfully")

      toast({
        title: "PDF Generado",
        description: "¡Factura PDF generada exitosamente!",
      })
    } catch (error) {
      console.error("[v0] Error generating PDF invoice:", error)
      let errorMessage = "Error desconocido"
      if (error instanceof Error) {
        if (error.message.includes("404")) {
          errorMessage = "Pedido no encontrado"
        } else if (error.message.includes("fetch")) {
          errorMessage = "Error de conexión al servidor"
        } else if (error.message.includes("jsPDF")) {
          errorMessage = "Error al cargar la librería PDF"
        } else {
          errorMessage = error.message
        }
      }
      toast({
        title: "Error al generar PDF",
        description: errorMessage,
        variant: "destructive",
      })
    }
  }

  const deleteOrder = async (orderId: number) => {
    try {
      console.log("[v0] Attempting to delete order:", orderId)
      const response = await fetch(`/api/orders/${orderId}`, {
        method: "DELETE",
      })

      if (response.ok) {
        const result = await response.json()
        console.log("[v0] Order deleted successfully:", result)
        await fetchOrders()
        setDeleteConfirm(null)
        if (selectedOrder?.id === orderId) {
          setShowDetails(false)
        }
        toast({
          title: "Pedido Eliminado",
          description: "Pedido eliminado exitosamente (stock no restaurado)",
        })
      } else {
        const errorData = await response.json()
        console.error("Error deleting order:", errorData)
        toast({
          title: "Error al eliminar",
          description: errorData.error || "Error desconocido",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error deleting order:", error)
      toast({
        title: "Error al eliminar",
        description: "Error al eliminar el pedido",
        variant: "destructive",
      })
    }
  }

  const updateOrderStatus = async (orderId: number, status: string) => {
    try {
      console.log("[v0] Updating order status:", orderId, "to", status)
      const response = await fetch(`/api/orders/${orderId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status }),
      })

      if (response.ok) {
        const result = await response.json()
        console.log("[v0] Order status updated successfully:", result)
        await fetchOrders()
        setStatusDialog(null)

        window.dispatchEvent(
          new CustomEvent("orderUpdated", {
            detail: { orderId, status, timestamp: Date.now() },
          }),
        )

        toast({
          title: "Estado Actualizado",
          description: `Estado del pedido actualizado a: ${getStatusText(status)}`,
        })
      } else {
        const errorData = await response.json()
        console.error("Error updating order status:", errorData)
        toast({
          title: "Error al actualizar",
          description: errorData.error || "Error desconocido",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error updating order status:", error)
      toast({
        title: "Error al actualizar",
        description: "Error al actualizar el estado del pedido",
        variant: "destructive",
      })
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-500"
      case "completed":
        return "bg-green-500"
      case "cancelled":
        return "bg-red-500"
      default:
        return "bg-gray-500"
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case "pending":
        return "Pendiente"
      case "completed":
        return "Completado"
      case "cancelled":
        return "Cancelado"
      default:
        return status
    }
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold bg-gradient-to-r from-rose-600 to-pink-600 bg-clip-text text-transparent">
        Gestión de Pedidos
      </h2>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filtros de Búsqueda
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            <div className="space-y-2">
              <Label htmlFor="search">Buscar</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  id="search"
                  placeholder="Nombre, email, ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Estado</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos los estados" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los estados</SelectItem>
                  <SelectItem value="pending">Pendiente</SelectItem>
                  <SelectItem value="completed">Completado</SelectItem>
                  <SelectItem value="cancelled">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="date">Fecha</Label>
              <Input id="date" type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="minAmount">Monto Mín.</Label>
              <Input
                id="minAmount"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={minAmount}
                onChange={(e) => setMinAmount(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="maxAmount">Monto Máx.</Label>
              <Input
                id="maxAmount"
                type="number"
                step="0.01"
                placeholder="999999.99"
                value={maxAmount}
                onChange={(e) => setMaxAmount(e.target.value)}
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
            Mostrando {filteredOrders.length} de {orders.length} pedidos
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/3"></div>
              </CardHeader>
              <CardContent>
                <div className="h-3 bg-gray-200 rounded w-full mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-2/3"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => (
            <Card key={order.id} className="hover:shadow-lg transition-all duration-300">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Package className="w-5 h-5" />
                      Pedido #{order.id}
                    </CardTitle>
                    <div className="space-y-1 mt-2">
                      <p className="text-muted-foreground flex items-center gap-2">
                        <User className="w-4 h-4" />
                        {order.customer_name}
                      </p>
                      <p className="text-sm text-muted-foreground">{order.customer_email}</p>
                      {order.customer_phone && <p className="text-sm text-muted-foreground">{order.customer_phone}</p>}
                    </div>
                  </div>
                  <Badge className={getStatusColor(order.status)}>{getStatusText(order.status)}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-2xl font-bold text-primary flex items-center gap-2">
                      <DollarSign className="w-6 h-6" />
                      C${Number(order.total_amount).toFixed(2)}
                    </p>
                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                      <Calendar className="w-4 h-4 mr-1" />
                      {new Date(order.created_at).toLocaleDateString("es-ES")}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => fetchOrderDetails(order.id)}>
                      <Eye className="w-4 h-4 mr-1" />
                      Ver Detalles
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setStatusDialog({ orderId: order.id, currentStatus: order.status })
                        setNewStatus(order.status)
                      }}
                      className="text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                    >
                      <Edit className="w-4 h-4 mr-1" />
                      Estado
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => generateInvoice(order.id)}
                      className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                    >
                      <Download className="w-4 h-4 mr-1" />
                      Descargar PDF
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDeleteConfirm(order.id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      Eliminar
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!loading && filteredOrders.length === 0 && orders.length > 0 && (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gradient-to-br from-rose-100 to-pink-100 rounded-full flex items-center justify-center mb-4 mx-auto">
            <Search className="h-8 w-8 text-rose-500" />
          </div>
          <h3 className="text-lg font-semibold mb-2">No se encontraron pedidos</h3>
          <p className="text-muted-foreground mb-4">
            Intenta ajustar los filtros de búsqueda para encontrar los pedidos que buscas
          </p>
          <Button onClick={clearFilters} variant="outline">
            Limpiar Filtros
          </Button>
        </div>
      )}

      {!loading && orders.length === 0 && (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gradient-to-br from-rose-100 to-pink-100 rounded-full flex items-center justify-center mb-4 mx-auto">
            <Package className="h-8 w-8 text-rose-500" />
          </div>
          <h3 className="text-lg font-semibold mb-2">No hay pedidos registrados</h3>
          <p className="text-muted-foreground mb-4">Los pedidos aparecerán aquí cuando los clientes realicen compras</p>
        </div>
      )}

      <Dialog open={statusDialog !== null} onOpenChange={() => setStatusDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cambiar Estado del Pedido</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p>Cambiar estado del pedido #{statusDialog?.orderId}</p>
            <div className="space-y-2">
              <Label htmlFor="status">Nuevo Estado</Label>
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pendiente</SelectItem>
                  <SelectItem value="completed">Completado</SelectItem>
                  <SelectItem value="cancelled">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setStatusDialog(null)}>
                Cancelar
              </Button>
              <Button
                onClick={() => statusDialog && updateOrderStatus(statusDialog.orderId, newStatus)}
                disabled={newStatus === statusDialog?.currentStatus}
              >
                Actualizar Estado
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteConfirm !== null} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Eliminación</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p>¿Estás seguro de que quieres eliminar el pedido #{deleteConfirm}?</p>
            <p className="text-sm text-muted-foreground">
              Esta acción NO restaurará el stock de los productos y no se puede deshacer.
            </p>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
                Cancelar
              </Button>
              <Button variant="destructive" onClick={() => deleteConfirm && deleteOrder(deleteConfirm)}>
                Eliminar Pedido
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="w-5 h-5" />
              Detalles del Pedido #{selectedOrder?.id}
            </DialogTitle>
          </DialogHeader>

          {selectedOrder && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <User className="w-4 h-4" />
                      Información del Cliente
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <p>
                      <strong>Nombre:</strong> {selectedOrder.customer_name}
                    </p>
                    <p>
                      <strong>Email:</strong> {selectedOrder.customer_email}
                    </p>
                    {selectedOrder.customer_phone && (
                      <p>
                        <strong>Teléfono:</strong> {selectedOrder.customer_phone}
                      </p>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      Información del Pedido
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <p>
                      <strong>Fecha:</strong> {new Date(selectedOrder.created_at).toLocaleDateString("es-ES")}
                    </p>
                    <p>
                      <strong>Estado:</strong>
                      <Badge className={`ml-2 ${getStatusColor(selectedOrder.status)}`}>
                        {getStatusText(selectedOrder.status)}
                      </Badge>
                    </p>
                    <p className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4 mr-1" />
                      <strong>Total:</strong> C${Number(selectedOrder.total_amount).toFixed(2)}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {selectedOrder.items && selectedOrder.items.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Productos del Pedido</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left p-2">Producto</th>
                            <th className="text-left p-2">Marca</th>
                            <th className="text-center p-2">Cantidad</th>
                            <th className="text-right p-2">Precio Unit.</th>
                            <th className="text-right p-2">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedOrder.items
                            .filter((item) => item.product_name)
                            .map((item, index) => (
                              <tr key={index} className="border-b">
                                <td className="p-2">{item.product_name}</td>
                                <td className="p-2">{item.product_brand || "-"}</td>
                                <td className="p-2 text-center">{item.quantity}</td>
                                <td className="p-2 text-right">C${Number(item.unit_price).toFixed(2)}</td>
                                <td className="p-2 text-right font-semibold">
                                  C${Number(item.total_price).toFixed(2)}
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setStatusDialog({ orderId: selectedOrder.id, currentStatus: selectedOrder.status })
                    setNewStatus(selectedOrder.status)
                  }}
                  className="text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Cambiar Estado
                </Button>
                <Button
                  variant="outline"
                  onClick={() => generateInvoice(selectedOrder.id)}
                  className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Descargar PDF
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => {
                    setShowDetails(false)
                    setDeleteConfirm(selectedOrder.id)
                  }}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Eliminar Pedido
                </Button>
                <Button onClick={() => setShowDetails(false)}>Cerrar</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
