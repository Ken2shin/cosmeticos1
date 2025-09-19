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
      console.log("[v0] Client: Fetching products for catalog display...")
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

      console.log("[v0] Client: API response status:", response.status)

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      console.log("[v0] Client: Raw API data:", data)

      const validProducts = Array.isArray(data) ? data : []
      console.log("[v0] Client: Products fetched for catalog:", validProducts.length)
      console.log(
        "[v0] Client: Product names:",
        validProducts.map((p) => p.name),
      )

      setProducts(validProducts)
    } catch (error) {
      console.error("[v0] Client: Error fetching products:", error)
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

    const handleStockUpdate = (event: CustomEvent<{ productId: number | string; newStock: number }>) => {
      const { productId, newStock } = event.detail
      setProducts((prevProducts) =>
        prevProducts.map((product) =>
          product.id === productId ? { ...product, stock_quantity: newStock } : product,
        ),
      )
    }

    const handleProductDeleted = (event: CustomEvent<{ productId: number | string }>) => {
      const { productId } = event.detail
      setProducts((prevProducts) => prevProducts.filter((product) => product.id !== productId))
    }

    const events = [
      { name: "productCreated" as const, handler: handleProductUpdate },
      { name: "productDeleted" as const, handler: handleProductDeleted },
      { name: "productUpdated" as const, handler: handleProductUpdate },
      { name: "stockUpdated" as const, handler: handleStockUpdate },
      { name: "inventoryChanged" as const, handler: handleProductUpdate },
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
    console.log("[v0] Client: Filtering products. Total:", validProducts.length, "Selected category:", selectedCategory)

    const filtered = validProducts.filter((product) => {
      if (!product || typeof product !== "object") return false

      const categoryMatch = true // Force all products to show

      const searchMatch =
        searchTerm === "" ||
        (product.name && product.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (product.brand && product.brand.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (product.description && product.description.toLowerCase().includes(searchTerm.toLowerCase()))

      console.log("[v0] Client: Product:", product.name, "Category match:", categoryMatch, "Search match:", searchMatch)
      return categoryMatch && searchMatch
    })

    console.log("[v0] Client: Filtered products count:", filtered.length)
    return filtered
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
  console.log("[v0] Client: Final products to render:", validFilteredProducts.length)

  if (validFilteredProducts.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-500 text-lg">No se encontraron productos</div>
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