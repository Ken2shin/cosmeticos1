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
  const [mounted, setMounted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/products?t=${Date.now()}`, {
        cache: "no-store",
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
        },
      })

      if (response.ok) {
        const data = await response.json()
        if (Array.isArray(data) && data.length > 0) {
          setProducts(data)
        } else {
          setProducts([])
        }
      } else {
        setError(`Error loading products: ${response.status}`)
        setProducts([])
      }
    } catch (error) {
      setError("Failed to load products")
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

  const filteredProducts = useMemo(() => {
    if (!products.length) {
      return []
    }

    const filtered = products.filter((product) => {
      if (!product) return false

      const categoryMatch =
        selectedCategory === "Todos" ||
        selectedCategory === "all" ||
        selectedCategory === "" ||
        !selectedCategory ||
        (product.category && product.category.toLowerCase().includes(selectedCategory.toLowerCase())) ||
        (product.name && product.name.toLowerCase().includes(selectedCategory.toLowerCase()))

      // Search filtering
      const searchMatch =
        !searchTerm ||
        searchTerm === "" ||
        (product.name && product.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (product.brand && product.brand.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (product.description && product.description.toLowerCase().includes(searchTerm.toLowerCase()))

      return categoryMatch && searchMatch
    })

    return filtered
  }, [products, selectedCategory, searchTerm])

  if (!mounted || loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 bg-[length:200%_100%] animate-shimmer rounded-lg h-48 sm:h-64 mb-4"></div>
            <div className="bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 bg-[length:200%_100%] animate-shimmer rounded h-4 mb-2"></div>
            <div className="bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 bg-[length:200%_100%] animate-shimmer rounded h-4 w-2/3"></div>
          </div>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500 text-lg mb-2">Error al cargar productos</p>
        <p className="text-gray-400 text-sm mb-4">{error}</p>
        <button
          onClick={fetchProducts}
          className="px-4 py-2 bg-pink-500 text-white rounded hover:bg-pink-600 transition-colors"
        >
          Reintentar
        </button>
      </div>
    )
  }

  if (!filteredProducts.length) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 text-lg">No se encontraron productos</p>
        <p className="text-gray-400 text-sm mt-2">
          {selectedCategory !== "Todos" && selectedCategory !== "all"
            ? `No hay productos en la categoría "${selectedCategory}"`
            : "No hay productos disponibles"}
        </p>
        {products.length === 0 && (
          <p className="text-gray-400 text-xs mt-2">Verifica que la base de datos esté configurada correctamente</p>
        )}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {filteredProducts.map((product, index) => {
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
