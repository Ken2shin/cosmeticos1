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
    return () => {
      setMounted(false)
    }
  }, [])

  const fetchProducts = useCallback(async () => {
    // AbortController para poder cancelar fetch al desmontar
    const controller = new AbortController()
    const signal = controller.signal

    // local guard para evitar setState si ya se desmontó
    let didCancel = false
    const markCancel = () => {
      didCancel = true
      controller.abort()
    }

    try {
      if (process.env.NODE_ENV !== "production") {
        console.log("[ProductGrid] Fetching products...")
      }
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
        signal,
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()

      const validProducts = Array.isArray(data) ? data : []

      if (!didCancel && mounted) {
        setProducts(validProducts)
      }
    } catch (err: any) {
      // Si abort fue la causa no mostramos error
      if (err?.name === "AbortError") {
        if (process.env.NODE_ENV !== "production") {
          console.warn("[ProductGrid] Fetch aborted")
        }
        return
      }

      console.error("[ProductGrid] Error fetching products:", err)
      if (!didCancel && mounted) {
        setError("Error al cargar productos")
        // fallback ligero (ejemplo), asegúrate de adaptarlo al tipo Product
        setProducts([
          {
            id: 1,
            name: "Labial Mate Rosa",
            description: "Labial de larga duración con acabado mate",
            price: 25.99,
            stock_quantity: 10,
            brand: "Beauty Co",
            category: "labial",
            image_url: "/pink-matte-lipstick.jpg",
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          } as unknown as Product,
          {
            id: 2,
            name: "Base Líquida Natural",
            description: "Base de maquillaje con cobertura natural",
            price: 45.5,
            stock_quantity: 8,
            brand: "Marbellin",
            category: "marbellin",
            image_url: "/liquid-foundation-natural.jpg",
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          } as unknown as Product,
          {
            id: 3,
            name: "Máscara de Pestañas",
            description: "Máscara voluminizadora resistente al agua",
            price: 32.0,
            stock_quantity: 15,
            brand: "Beauty Co",
            category: "ojos",
            image_url: "/mascara-pesta-as-beauty.jpg",
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          } as unknown as Product,
        ])
      }
    } finally {
      if (!signal.aborted && mounted) {
        setLoading(false)
      } else {
        // en caso de aborto, aseguramos no forzar estado
        if (process.env.NODE_ENV !== "production") {
          console.log("[ProductGrid] fetchProducts finalized (aborted or unmounted)")
        }
      }
    }

    // devuelve cleanup para quien lo quiera usar (no usado aquí)
    return markCancel
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted])

  useEffect(() => {
    if (mounted) {
      // Llamamos fetchProducts y guardamos posibilidad de cancelarlo
      const promiseOrCancel = fetchProducts()
      // Si fetchProducts devolviera cleanup (no necesario), podríamos manejarlo
      // pero fetchProducts devuelve una función síncrona sólo si la implementamos así.
      // Nothing more to do here.
    }
  }, [fetchProducts, mounted])

  useEffect(() => {
    if (!mounted) return

    let isActive = true

    const handleProductUpdate = (e?: Event) => {
      // recarga ligera
      try {
        if (!isActive) return
        fetchProducts()
      } catch (err) {
        console.error("[ProductGrid] handleProductUpdate error:", err)
      }
    }

    const handleStockUpdate = (e: Event) => {
      try {
        const ev = e as CustomEvent<{ productId: number | string; newStock: number }>
        const { productId, newStock } = ev.detail || {}
        if (productId == null) return
        setProducts((prevProducts) => {
          const currentProducts = Array.isArray(prevProducts) ? prevProducts : []
          return currentProducts.map((product) =>
            // comparo con == para permitir number/string id combos
            (product as any).id == productId ? { ...(product as any), stock_quantity: newStock } : product,
          )
        })
      } catch (err) {
        console.error("[ProductGrid] handleStockUpdate error:", err)
      }
    }

    const handleProductDeleted = (e: Event) => {
      try {
        const ev = e as CustomEvent<{ productId: number | string }>
        const { productId } = ev.detail || {}
        if (productId == null) return
        setProducts((prevProducts) => {
          const currentProducts = Array.isArray(prevProducts) ? prevProducts : []
          return currentProducts.filter((product) => (product as any).id != productId)
        })
      } catch (err) {
        console.error("[ProductGrid] handleProductDeleted error:", err)
      }
    }

    const events: Array<{ name: string; handler: EventListener }> = [
      { name: "productCreated", handler: handleProductUpdate as EventListener },
      { name: "productDeleted", handler: handleProductDeleted as EventListener },
      { name: "productUpdated", handler: handleProductUpdate as EventListener },
      { name: "stockUpdated", handler: handleStockUpdate as EventListener },
      { name: "inventoryChanged", handler: handleProductUpdate as EventListener },
    ]

    events.forEach(({ name, handler }) => {
      window.addEventListener(name, handler)
    })

    return () => {
      isActive = false
      events.forEach(({ name, handler }) => {
        window.removeEventListener(name, handler)
      })
    }
    // fetchProducts es estable via useCallback y mounted incluido
  }, [fetchProducts, mounted])

  const filteredProducts = useMemo(() => {
    const validProducts = Array.isArray(products) ? products : []

    const normalizedSelected = (selectedCategory || "all").toString().trim().toLowerCase()
    const normalizedSearch = (searchTerm || "").toString().trim().toLowerCase()

    return validProducts.filter((product) => {
      if (!product || typeof product !== "object") return false

      const productCategory = ((product as any).category || "").toString().toLowerCase()
      const productName = ((product as any).name || "").toString().toLowerCase()
      const productBrand = ((product as any).brand || "").toString().toLowerCase()
      const productDescription = ((product as any).description || "").toString().toLowerCase()

      const categoryMatch =
        normalizedSelected === "all" ||
        normalizedSelected === "todos" ||
        productCategory === normalizedSelected

      const searchMatch =
        normalizedSearch === "" ||
        productName.includes(normalizedSearch) ||
        productBrand.includes(normalizedSearch) ||
        productDescription.includes(normalizedSearch)

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
          onClick={() => fetchProducts()}
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
            Total productos disponibles: {products.length} | Categoría: "{selectedCategory}"
            {searchTerm && ` | Búsqueda: "${searchTerm}"`}
          </p>
        )}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {validFilteredProducts.map((product, index) => {
        if (!product || (product as any).id == null) return null

        return (
          <div
            key={String((product as any).id)}
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
