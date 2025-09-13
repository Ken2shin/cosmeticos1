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
  const [fallbackAttempts, setFallbackAttempts] = useState(0)
  const { dispatch } = useCart()

  const handleAddToCart = async () => {
    setIsAdding(true)
    await new Promise((resolve) => setTimeout(resolve, 800))
    dispatch({ type: "ADD_ITEM", payload: product })
    setIsAdding(false)
  }

  const getImageUrl = () => {
    console.log(
      "[v0] Client ProductCard - Getting image for:",
      product.name,
      "URL:",
      product.image_url,
      "Error:",
      imageError,
      "Attempts:",
      fallbackAttempts,
    )

    // Strategy 1: Use original image_url if available and no error
    if (product.image_url && !imageError && fallbackAttempts === 0) {
      // Check if it's a blob URL or base64
      if (product.image_url.startsWith("data:") || product.image_url.includes("blob.vercel-storage.com")) {
        return product.image_url
      }
      // If it's a placeholder URL, enhance it
      if (product.image_url.includes("placeholder.svg")) {
        return `/placeholder.svg?height=300&width=300&query=${encodeURIComponent(product.name + " " + (product.category || "beauty") + " product")}&color=f472b6&bg=fdf2f8`
      }
      return product.image_url
    }

    // Strategy 2: Enhanced placeholder with product details
    const enhancedPlaceholder = `/placeholder.svg?height=300&width=300&query=${encodeURIComponent(
      product.name + " " + (product.category || "beauty") + " cosmetic product",
    )}&color=f472b6&bg=fdf2f8&text=${encodeURIComponent(product.name)}`

    return enhancedPlaceholder
  }

  const handleImageError = () => {
    console.log("[v0] Client ProductCard - Image error for:", product.name, "Attempts:", fallbackAttempts)
    setFallbackAttempts((prev) => prev + 1)
    setImageError(true)

    // Force re-render with new fallback
    setTimeout(() => {
      setImageError(false)
    }, 100)
  }

  return (
    <Card className="group hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 animate-in fade-in-0 slide-in-from-bottom-4 border-0 bg-white/80 backdrop-blur-sm">
      <CardContent className="p-0">
        <div className="relative overflow-hidden rounded-t-lg">
          <div className="relative w-full h-64 bg-gradient-to-br from-pink-50 to-rose-100">
            <Image
              src={getImageUrl() || "/placeholder.svg"}
              alt={product.name}
              width={300}
              height={300}
              className="w-full h-64 object-cover group-hover:scale-110 transition-transform duration-700"
              onError={handleImageError}
              unoptimized={true}
              priority={false}
              style={{
                objectFit: "cover",
                backgroundColor: "#fdf2f8",
              }}
            />
            {/* Fallback overlay if image fails */}
            {imageError && fallbackAttempts > 2 && (
              <div className="absolute inset-0 bg-gradient-to-br from-pink-100 to-rose-200 flex items-center justify-center">
                <div className="text-center p-4">
                  <div className="w-16 h-16 mx-auto mb-2 bg-pink-200 rounded-full flex items-center justify-center">
                    <ShoppingCart className="w-8 h-8 text-pink-600" />
                  </div>
                  <p className="text-sm font-medium text-pink-800">{product.name}</p>
                  <p className="text-xs text-pink-600">{product.category}</p>
                </div>
              </div>
            )}
          </div>

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
