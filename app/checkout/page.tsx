"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, ShoppingBag } from "lucide-react"
import { CheckoutForm } from "@/components/cart/checkout-form"

interface CartItem {
  id: number
  name: string
  price: number
  quantity: number
  image: string
}

export default function CheckoutPage() {
  const router = useRouter()
  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const [total, setTotal] = useState(0)

  useEffect(() => {
    const savedCart = localStorage.getItem("cart")
    if (savedCart) {
      const items = JSON.parse(savedCart)
      setCartItems(items)
      const totalAmount = items.reduce((sum: number, item: CartItem) => sum + item.price * item.quantity, 0)
      setTotal(totalAmount)
    } else {
      // If no cart items, redirect back to catalog
      router.push("/")
    }
  }, [router])

  const handleBackToCatalog = () => {
    router.push("/")
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="outline"
            size="sm"
            onClick={handleBackToCatalog}
            className="flex items-center gap-2 bg-transparent"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver al Catálogo
          </Button>
          <div className="flex items-center gap-2">
            <ShoppingBag className="h-6 w-6 text-pink-600" />
            <h1 className="text-2xl font-bold text-gray-900">Finalizar Pedido</h1>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Order Summary */}
          <Card className="h-fit">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingBag className="h-5 w-5" />
                Resumen del Pedido
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {cartItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between py-3 border-b border-gray-100 last:border-b-0"
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={item.image || "/placeholder.svg"}
                      alt={item.name}
                      className="w-12 h-12 rounded-lg object-cover"
                    />
                    <div>
                      <h4 className="font-medium text-gray-900">{item.name}</h4>
                      <p className="text-sm text-gray-500">Cantidad: {item.quantity}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-pink-600">C${(item.price * item.quantity).toFixed(2)}</p>
                  </div>
                </div>
              ))}

              <div className="pt-4 border-t border-gray-200">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold text-gray-900">Total a Pagar:</span>
                  <span className="text-xl font-bold text-pink-600">C${total.toFixed(2)}</span>
                </div>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-4">
                <p className="text-sm text-yellow-800 flex items-center gap-2">
                  <span>⚠️</span>
                  No necesitas pagar ahora. El administrador te contactará para coordinar la entrega y el pago.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Checkout Form */}
          <Card>
            <CardHeader>
              <CardTitle>Información de Contacto</CardTitle>
            </CardHeader>
            <CardContent>
              <CheckoutForm onBack={handleBackToCatalog} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
