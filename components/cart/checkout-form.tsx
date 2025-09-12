"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, User, Send, CheckCircle, Phone, ShoppingBag } from "lucide-react"
import { useCart } from "@/contexts/cart-context"

interface CheckoutFormProps {
  onBack: () => void
}

export function CheckoutForm({ onBack }: CheckoutFormProps) {
  const { state, dispatch } = useCart()
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [orderComplete, setOrderComplete] = useState(false)
  const [orderId, setOrderId] = useState<number | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      console.log("[v0] Validating stock before order creation")

      const itemsWithoutPrice = state.items.filter((item) => !item.price || item.price <= 0)
      if (itemsWithoutPrice.length > 0) {
        const itemNames = itemsWithoutPrice.map((item) => item.name).join(", ")
        alert(
          `❌ Error: Los siguientes productos no tienen precio definido: ${itemNames}. Por favor actualiza el carrito.`,
        )
        setIsSubmitting(false)
        return
      }

      const stockCheckResponse = await fetch("/api/products/check-stock", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          items: state.items.map((item) => ({
            id: item.id,
            quantity: item.quantity,
          })),
        }),
      })

      const stockCheck = await stockCheckResponse.json()

      if (!stockCheck.all_available) {
        const unavailableItems = stockCheck.items.filter((item: any) => !item.available)
        const errorMessages = unavailableItems.map(
          (item: any) =>
            `${item.product_name}: Stock disponible ${item.current_stock}, solicitado ${item.requested_quantity}`,
        )

        alert(
          `❌ Stock insuficiente:\n\n${errorMessages.join("\n")}\n\nPor favor ajusta las cantidades y vuelve a intentar.`,
        )
        setIsSubmitting(false)
        return
      }

      const orderData = {
        customer_name: formData.name,
        customer_phone: formData.phone,
        customer_email: `${formData.phone}@customer.local`, // Generate email from phone for tracking
        items: state.items.map((item) => ({
          product_id: item.id,
          quantity: item.quantity,
          price: Number(item.price) || 0,
        })),
        total: state.total,
        status: "pending",
      }

      const response = await fetch("/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(orderData),
      })

      if (response.ok) {
        const order = await response.json()
        setOrderId(order.id)
        setOrderComplete(true)
        dispatch({ type: "CLEAR_CART" })

        await fetch("/api/notifications/broadcast", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            type: "new_order",
            title: "🛍️ Nueva Lista de Pedido",
            message: `${formData.name} envió una lista de pedido por C$${state.total.toFixed(2)}`,
            data: {
              orderId: order.id,
              customerName: formData.name,
              customerPhone: formData.phone,
              total: state.total,
              items: state.items,
            },
          }),
        })
      } else {
        const errorData = await response.json()
        if (errorData.code === "INSUFFICIENT_STOCK") {
          alert(
            `❌ ${errorData.error}\n\nStock disponible: ${errorData.available_stock}\nCantidad solicitada: ${errorData.requested_quantity}`,
          )
        } else {
          throw new Error(errorData.error || "Error al procesar el pedido")
        }
      }
    } catch (error) {
      console.error("Error al enviar lista de pedido:", error)
      alert(`❌ Error al procesar el pedido: ${error instanceof Error ? error.message : "Error desconocido"}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (orderComplete) {
    return (
      <div className="flex flex-col items-center justify-center h-full space-y-6 p-8">
        <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center">
          <CheckCircle className="w-12 h-12 text-green-600" />
        </div>
        <div className="text-center space-y-3 max-w-md">
          <h3 className="text-3xl font-bold text-green-600">¡Lista Enviada!</h3>
          <p className="text-lg text-muted-foreground">
            Tu lista de pedido #{orderId} ha sido enviada exitosamente al administrador.
          </p>
          <p className="text-base text-muted-foreground">
            Te contactaremos pronto al <span className="font-semibold">{formData.phone}</span> para coordinar la entrega
            y el pago.
          </p>
          <div className="bg-rose-50 p-6 rounded-lg mt-6 border border-rose-200">
            <p className="text-rose-800 font-bold text-xl">Total: C${state.total.toFixed(2)}</p>
            <p className="text-rose-600 text-sm mt-1">El pago se realizará al momento de la entrega</p>
          </div>
        </div>
        <Button
          onClick={onBack}
          className="w-full max-w-md bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700"
          size="lg"
        >
          Continuar Navegando
        </Button>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col p-6">
      <div className="flex items-center gap-4 mb-8 pb-4 border-b">
        <Button variant="ghost" size="icon" onClick={onBack} className="hover:bg-rose-50">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h2 className="text-2xl font-bold">Enviar Lista de Pedido</h2>
      </div>

      <div className="flex-1 space-y-8 overflow-y-auto">
        <Card className="shadow-sm border-rose-100">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-3 text-xl">
              <User className="h-6 w-6 text-rose-600" />
              Información de Contacto
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-3">
                <Label htmlFor="name" className="text-base font-medium flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Nombre Completo *
                </Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Ingresa tu nombre completo"
                  value={formData.name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                  required
                  className="h-12 text-base focus:ring-2 focus:ring-rose-500 border-gray-200"
                />
              </div>

              <div className="space-y-3">
                <Label htmlFor="phone" className="text-base font-medium flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  Número de Teléfono *
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+505 8888-8888"
                  value={formData.phone}
                  onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
                  required
                  className="h-12 text-base focus:ring-2 focus:ring-rose-500 border-gray-200"
                />
              </div>
            </form>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-rose-100">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-3 text-xl">
              <ShoppingBag className="h-6 w-6 text-rose-600" />
              Lista de Productos Seleccionados
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="max-h-80 overflow-y-auto space-y-3">
              {state.items.map((item) => (
                <div
                  key={item.id}
                  className="flex justify-between items-center p-4 bg-rose-50 rounded-lg border border-rose-100"
                >
                  <div className="flex-1">
                    <span className="font-medium text-gray-900">{item.name}</span>
                    <div className="text-sm text-gray-600 mt-1">
                      Cantidad: <span className="font-semibold">{item.quantity}</span> × C${item.price}
                    </div>
                  </div>
                  <span className="font-bold text-rose-600 text-lg ml-4">
                    C${(item.price * item.quantity).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>

            <div className="border-t border-gray-200 pt-4 mt-6">
              <div className="flex justify-between items-center font-bold text-xl bg-gradient-to-r from-rose-50 to-pink-50 p-4 rounded-lg border border-rose-200">
                <span>Total a Pagar:</span>
                <span className="text-rose-600">C${state.total.toFixed(2)}</span>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg">
              <p className="text-amber-800 text-base font-medium flex items-start gap-3">
                <span className="text-xl">💡</span>
                <span>
                  No necesitas pagar ahora. El administrador te contactará para coordinar la entrega y el pago.
                </span>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="pt-6 border-t bg-white">
        <Button
          onClick={handleSubmit}
          disabled={!formData.name || !formData.phone || isSubmitting}
          className="w-full bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 transition-all duration-200 h-14 text-lg font-semibold"
          size="lg"
        >
          {isSubmitting ? (
            <>
              <div className="w-5 h-5 mr-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Enviando Lista...
            </>
          ) : (
            <>
              <Send className="w-5 h-5 mr-3" />
              Enviar Lista al Administrador
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
