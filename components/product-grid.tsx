"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { ProductCard } from "@/components/product-card"
import type { Product } from "@/types/product"

interface ProductGridProps {
  selectedCategory: string
  searchTerm?: string
}

export function ProductGrid({ selectedCategory, searchTerm = "" }: ProductGridProps) {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const fetchProducts = useCallback(async () => {
    try {
      console.log("[v0] Fetching products for management...")
      setError(null)
      setLoading(true)

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
      const validProducts = Array.isArray(data) ? data : []
      console.log("[v0] Products fetched for management:", validProducts.length)
      setProducts(validProducts)
    } catch (error) {
      console.error("[v0] Error fetching products:", error)
      setError("Error al cargar productos")
      setProducts([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (mounted) {
      fetchProducts()
    }
  }, [fetchProducts, mounted])

  useEffect(() => {
    if (!mounted) return

    const handleProductUpdate = () => {
      fetchProducts()
    }

    const handleStockUpdate = (event: Event) => {
      const { productId, newStock } = (event as CustomEvent).detail
      setProducts((prevProducts) => {
        const currentProducts = Array.isArray(prevProducts) ? prevProducts : []
        return currentProducts.map((product) =>
          product.id === productId ? { ...product, stock_quantity: newStock } : product,
        )
      })
    }

    const handleProductDeleted = (event: Event) => {
      const { productId } = (event as CustomEvent).detail
      setProducts((prevProducts) => {
        const currentProducts = Array.isArray(prevProducts) ? prevProducts : []
        return currentProducts.filter((product) => product.id !== productId)
      })
    }

    const events = [
      { name: "productCreated", handler: handleProductUpdate },
      { name: "productDeleted", handler: handleProductDeleted },
      { name: "productUpdated", handler: handleProductUpdate },
      { name: "stockUpdated", handler: handleStockUpdate },
      { name: "inventoryChanged", handler: handleProductUpdate },
    ]

    events.forEach(({ name, handler }) => {
      window.addEventListener(name, handler as EventListener)
    })

    return () => {
      events.forEach(({ name, handler }) => {
        window.removeEventListener(name, handler as EventListener)
      })
    }
  }, [fetchProducts, mounted])

  const filteredProducts = useMemo(() => {
    const validProducts = Array.isArray(products) ? products : []

    return validProducts.filter((product) => {
      if (!product || typeof product !== "object") return false

      const categoryMatch =
        selectedCategory === "all" || (product.category?.toLowerCase() || "") === selectedCategory.toLowerCase()

      const searchMatch =
        searchTerm === "" ||
        (product.name && product.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (product.brand && product.brand.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (product.description && product.description.toLowerCase().includes(searchTerm.toLowerCase()))

      return categoryMatch && searchMatch
    })
  }, [products, selectedCategory, searchTerm])

  if (!mounted) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="bg-gray-200 rounded-lg h-48 sm:h-64 mb-4"></div>
            <div className="bg-gray-200 rounded h-4 mb-2"></div>
            <div className="bg-gray-200 rounded h-4 w-2/3"></div>
          </div>
        ))}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="bg-gray-200 rounded-lg h-48 sm:h-64 mb-4"></div>
            <div className="bg-gray-200 rounded h-4 mb-2"></div>
            <div className="bg-gray-200 rounded h-4 w-2/3"></div>
          </div>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-500 text-lg mb-4">{error}</div>
        <button
          onClick={fetchProducts}
          className="px-4 py-2 bg-rose-500 text-white rounded-lg hover:bg-rose-600 transition-colors"
        >
          Reintentar
        </button>
      </div>
    )
  }

  const validFilteredProducts = Array.isArray(filteredProducts) ? filteredProducts : []

  if (validFilteredProducts.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground text-lg">
          {searchTerm
            ? `No se encontraron productos que coincidan con "${searchTerm}"`
            : "No se encontraron productos en esta categoría."}
        </p>
        {Array.isArray(products) && products.length > 0 && (
          <p className="text-sm text-muted-foreground mt-2">
            Total productos disponibles: {products.length} | Categoría: "{selectedCategory}" |
            {searchTerm && ` Búsqueda: "${searchTerm}"`}
          </p>
        )}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {validFilteredProducts.map((product, index) => {
        if (!product || !product.id) return null

        return (
          <div
            key={product.id}
            className="opacity-0 animate-in fade-in-0 duration-300"
            style={{
              animationDelay: `${Math.min(index * 25, 200)}ms`,
              animationFillMode: "forwards",
            }}
          >
            <ProductCard product={product} />
          </div>
        )
      })}
    </div>
  )
}
