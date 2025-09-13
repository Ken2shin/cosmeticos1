"use client"

import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { Product } from "@/types/product"
import { ShoppingCart, Heart } from "lucide-react"
import { useState } from "react"
import { useCart } from "@/contexts/cart-context"

interface ProductCardProps {
  product: Product
}

export function ProductCard({ product }: ProductCardProps) {
  const [isLiked, setIsLiked] = useState(false)
  const [isAdding, setIsAdding] = useState(false)
  const [imageError, setImageError] = useState(false)
  const { dispatch } = useCart()

  const handleAddToCart = async () => {
    setIsAdding(true)
    await new Promise((resolve) => setTimeout(resolve, 800))
    dispatch({ type: "ADD_ITEM", payload: product })
    setIsAdding(false)
  }

  const getImageUrl = () => {
    if (!product.image_url || imageError) {
      return `/placeholder.svg?height=300&width=300&query=${encodeURIComponent(product.name + " beauty product")}`
    }
    return product.image_url
  }

  return (
    <Card className="group hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 animate-in fade-in-0 slide-in-from-bottom-4 border-0 bg-white/80 backdrop-blur-sm">
      <CardContent className="p-0">
        <div className="relative overflow-hidden rounded-t-lg">
          <Image
            src={getImageUrl() || "/placeholder.svg"}
            alt={product.name}
            width={300}
            height={300}
            className="w-full h-64 object-cover group-hover:scale-110 transition-transform duration-700"
            onError={() => setImageError(true)}
            unoptimized={getImageUrl().includes("placeholder.svg")}
          />
          <Badge className="absolute top-3 right-3 bg-gradient-to-r from-rose-500 to-pink-600 text-white border-0 animate-pulse">
            {product.category}
          </Badge>
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-3 left-3 bg-white/80 backdrop-blur-sm hover:bg-white hover:scale-110 transition-all duration-300"
            onClick={() => setIsLiked(!isLiked)}
          >
            <Heart
              className={`w-4 h-4 transition-colors duration-300 ${isLiked ? "fill-red-500 text-red-500" : "text-gray-600"}`}
            />
          </Button>
          {product.stock_quantity < 5 && (
            <Badge variant="destructive" className="absolute bottom-3 left-3 animate-bounce">
              ¡Últimas {product.stock_quantity}!
            </Badge>
          )}
        </div>

        <div className="p-4 space-y-3">
          <h3 className="font-semibold text-lg text-foreground mb-2 line-clamp-2 group-hover:text-rose-600 transition-colors duration-300">
            {product.name}
          </h3>
          <p className="text-muted-foreground text-sm mb-3 line-clamp-2">{product.description}</p>
          <div className="flex items-center justify-between">
            <span className="text-2xl font-bold bg-gradient-to-r from-rose-600 to-pink-600 bg-clip-text text-transparent">
              C${product.price}
            </span>
            <span className="text-sm text-muted-foreground font-medium">{product.brand}</span>
          </div>
        </div>
      </CardContent>

      <CardFooter className="p-4 pt-0">
        <Button
          onClick={handleAddToCart}
          className="w-full bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98]"
          size="sm"
          disabled={isAdding || product.stock_quantity === 0}
        >
          {isAdding ? (
            <>
              <div className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Agregando...
            </>
          ) : product.stock_quantity === 0 ? (
            "Agotado"
          ) : (
            <>
              <ShoppingCart className="w-4 h-4 mr-2" />
              Agregar al Carrito
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  )
}
