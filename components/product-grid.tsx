"use client"

import { useState, useEffect } from "react"
import { ProductCard } from "@/components/product-card"
import type { Product } from "@/types/product"

interface ProductGridProps {
  selectedCategory: string
  searchTerm?: string
}

export function ProductGrid({ selectedCategory, searchTerm = "" }: ProductGridProps) {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchProducts()
  }, [])

  useEffect(() => {
    const handleProductUpdate = (event: CustomEvent) => {
      console.log("[v0] Product update detected, refreshing grid")
      fetchProducts()
    }

    const handleStockUpdate = (event: CustomEvent) => {
      const { productId, newStock } = event.detail
      console.log("[v0] Stock update detected for product:", productId, "new stock:", newStock)

      setProducts((prevProducts) =>
        prevProducts.map((product) => (product.id === productId ? { ...product, stock_quantity: newStock } : product)),
      )
    }

    const handleProductDeleted = (event: CustomEvent) => {
      const { productId } = event.detail
      console.log("[v0] Product deleted:", productId)

      setProducts((prevProducts) => prevProducts.filter((product) => product.id !== productId))
    }

    const handleProductCreated = (event: CustomEvent) => {
      console.log("[v0] New product created, refreshing grid")
      fetchProducts()
    }

    const handleInventoryChanged = (event: CustomEvent) => {
      console.log("[v0] Inventory changed, updating affected products")
      fetchProducts()
    }

    window.addEventListener("productCreated", handleProductCreated)
    window.addEventListener("productDeleted", handleProductDeleted)
    window.addEventListener("productUpdated", handleProductUpdate)
    window.addEventListener("stockUpdated", handleStockUpdate)
    window.addEventListener("inventoryChanged", handleInventoryChanged)

    return () => {
      window.removeEventListener("productCreated", handleProductCreated)
      window.removeEventListener("productDeleted", handleProductDeleted)
      window.removeEventListener("productUpdated", handleProductUpdate)
      window.removeEventListener("stockUpdated", handleStockUpdate)
      window.removeEventListener("inventoryChanged", handleInventoryChanged)
    }
  }, [])

  const fetchProducts = async () => {
    try {
      console.log("[v0] Fetching products for grid")
      const timestamp = Date.now()
      const response = await fetch(`/api/products?t=${timestamp}`, {
        cache: "no-store",
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      console.log(
        "[v0] Products fetched for grid:",
        data?.length || 0,
        "Stock data:",
        data?.map((p: Product) => ({ name: p.name, stock: p.stock_quantity })),
      )
      setProducts(data || [])
    } catch (error) {
      console.error("[v0] Error fetching products:", error)
      setProducts([])
    } finally {
      setLoading(false)
    }
  }

  const filteredProducts = products.filter((product) => {
    const categoryMatch =
      selectedCategory === "all" || (product.category?.toLowerCase() || "") === selectedCategory.toLowerCase()

    const searchMatch =
      searchTerm === "" ||
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (product.brand && product.brand.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (product.description && product.description.toLowerCase().includes(searchTerm.toLowerCase()))

    return categoryMatch && searchMatch
  })

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 bg-[length:200%_100%] animate-[shimmer_1.5s_infinite] rounded-lg h-64 mb-4"></div>
            <div className="bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 bg-[length:200%_100%] animate-[shimmer_1.5s_infinite] rounded h-4 mb-2"></div>
            <div className="bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 bg-[length:200%_100%] animate-[shimmer_1.5s_infinite] rounded h-4 w-2/3"></div>
          </div>
        ))}
      </div>
    )
  }

  if (filteredProducts.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground text-lg">
          {searchTerm
            ? `No se encontraron productos que coincidan con "${searchTerm}"`
            : "No se encontraron productos en esta categoría."}
        </p>
        {products.length > 0 && (
          <p className="text-sm text-muted-foreground mt-2">
            Total productos disponibles: {products.length} | Categoría: "{selectedCategory}" |
            {searchTerm && `Búsqueda: "${searchTerm}"`}
          </p>
        )}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {filteredProducts.map((product, index) => (
        <div
          key={product.id}
          className="animate-in fade-in-0 slide-in-from-bottom-4 duration-500"
          style={{ animationDelay: `${index * 100}ms` }}
        >
          <ProductCard product={product} />
        </div>
      ))}
    </div>
  )
}
