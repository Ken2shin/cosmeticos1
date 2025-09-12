"use client"
import { useRouter } from "next/navigation"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ShoppingBag, Plus, Minus, Trash2 } from "lucide-react"
import { useCart } from "@/contexts/cart-context"
import Image from "next/image"

export function CartSidebar() {
  const { state, dispatch } = useCart()
  const router = useRouter()

  const updateQuantity = (id: number, quantity: number) => {
    dispatch({ type: "UPDATE_QUANTITY", payload: { id, quantity } })
  }

  const removeItem = (id: number) => {
    dispatch({ type: "REMOVE_ITEM", payload: id })
  }

  const handleCheckout = () => {
    // Save cart to localStorage for the checkout page
    localStorage.setItem("cart", JSON.stringify(state.items))
    // Navigate to checkout page
    router.push("/checkout")
  }

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative hover:bg-rose-50 hover:text-rose-600 transition-all duration-200 hover:scale-110"
        >
          <ShoppingBag className="h-5 w-5" />
          {state.itemCount > 0 && (
            <Badge className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 flex items-center justify-center bg-gradient-to-r from-rose-500 to-pink-600 text-xs animate-pulse">
              {state.itemCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>

      <SheetContent className="w-full sm:max-w-2xl lg:max-w-3xl">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5" />
            Lista de Productos Seleccionados
          </SheetTitle>
        </SheetHeader>

        <div className="flex flex-col h-full">
          {state.items.length === 0 ? (
            <div className="flex-1 flex items-center justify-center flex-col gap-4">
              <ShoppingBag className="h-16 w-16 text-muted-foreground" />
              <p className="text-muted-foreground text-center">Tu lista está vacía</p>
              <p className="text-sm text-muted-foreground text-center">
                Agrega productos para crear tu lista de pedido
              </p>
            </div>
          ) : (
            <>
              <div className="flex-1 overflow-y-auto py-6 space-y-4">
                {state.items.map((item) => (
                  <div
                    key={item.id}
                    className="flex gap-4 p-4 border rounded-lg bg-white shadow-sm hover:shadow-md transition-shadow"
                  >
                    <Image
                      src={item.image_url || "/placeholder.svg?height=80&width=80&query=beauty product"}
                      alt={item.name}
                      width={80}
                      height={80}
                      className="rounded-md object-cover flex-shrink-0"
                    />
                    <div className="flex-1 space-y-3">
                      <h4 className="font-medium text-base line-clamp-2">{item.name}</h4>
                      <div className="flex items-center justify-between">
                        <p className="text-rose-600 font-bold text-lg">C${item.price}</p>
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2 bg-gray-50 rounded-lg p-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 hover:bg-white"
                              onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <span className="w-8 text-center font-medium bg-white px-2 py-1 rounded">
                              {item.quantity}
                            </span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 hover:bg-white"
                              onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                            onClick={() => removeItem(item.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-sm text-gray-600">Subtotal: </span>
                        <span className="font-semibold text-rose-600">C${(item.price * item.quantity).toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t pt-6 space-y-4 bg-gradient-to-r from-rose-50 to-pink-50 -mx-6 px-6 pb-6">
                <div className="flex justify-between items-center text-xl font-bold bg-white p-4 rounded-lg shadow-sm">
                  <span>Total a Pagar:</span>
                  <span className="text-rose-600">C${state.total.toFixed(2)}</span>
                </div>

                <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg">
                  <p className="text-amber-800 text-sm flex items-start gap-2">
                    <span className="text-lg">💡</span>
                    <span>
                      No necesitas pagar ahora. El administrador te contactará para coordinar la entrega y el pago.
                    </span>
                  </p>
                </div>

                <Button
                  onClick={handleCheckout}
                  className="w-full bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white font-semibold py-3 text-lg"
                  size="lg"
                >
                  <ShoppingBag className="w-5 h-5 mr-2" />
                  Enviar Lista al Administrador
                </Button>
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
