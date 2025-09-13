"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Package, ShoppingCart, DollarSign, Users } from "lucide-react"

interface Stats {
  totalProducts: number
  totalOrders: number
  totalRevenue: number
  activeCustomers: number
}

export function DashboardStats() {
  const [stats, setStats] = useState<Stats>({
    totalProducts: 0,
    totalOrders: 0,
    totalRevenue: 0,
    activeCustomers: 0,
  })
  const [loading, setLoading] = useState(true)
  const [refreshCounter, setRefreshCounter] = useState(0)

  useEffect(() => {
    fetchStats()
    const interval = setInterval(fetchStats, 5000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const handleOrderUpdate = () => {
      console.log("[v0] Dashboard Stats: Order updated, forcing refresh")
      setRefreshCounter((prev) => prev + 1)
      fetchStats()
    }

    const handleProductUpdate = () => {
      console.log("[v0] Dashboard Stats: Product updated, forcing refresh")
      setRefreshCounter((prev) => prev + 1)
      fetchStats()
    }

    // Listen for custom events
    window.addEventListener("orderUpdated", handleOrderUpdate)
    window.addEventListener("productUpdated", handleProductUpdate)
    window.addEventListener("orderCreated", handleOrderUpdate)
    window.addEventListener("orderDeleted", handleOrderUpdate)

    return () => {
      window.removeEventListener("orderUpdated", handleOrderUpdate)
      window.removeEventListener("productUpdated", handleProductUpdate)
      window.removeEventListener("orderCreated", handleOrderUpdate)
      window.removeEventListener("orderDeleted", handleOrderUpdate)
    }
  }, [])

  const fetchStats = async () => {
    try {
      console.log("[v0] Dashboard Stats: Fetching latest statistics - Force refresh:", refreshCounter)
      const timestamp = Date.now()
      const randomParam = Math.random().toString(36).substring(7)
      const response = await fetch(`/api/admin/stats?t=${timestamp}&r=${randomParam}&force=${refreshCounter}`, {
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
      console.log("[v0] Dashboard Stats: Received data:", data)

      setStats({
        totalProducts: Number(data.totalProducts) || 0,
        totalOrders: Number(data.totalOrders) || 0,
        totalRevenue: Number(data.totalRevenue) || 0,
        activeCustomers: Number(data.activeCustomers) || 0,
      })
    } catch (error) {
      console.error("[v0] Dashboard Stats: Error fetching stats:", error)
      setTimeout(() => {
        console.log("[v0] Dashboard Stats: Retrying after error")
        fetchStats()
      }, 2000)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Productos</CardTitle>
          <Package className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{loading ? "..." : stats.totalProducts}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Pedidos</CardTitle>
          <ShoppingCart className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{loading ? "..." : stats.totalOrders}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Ingresos</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600 transition-all duration-300">
            C${loading ? "..." : stats.totalRevenue.toFixed(2)}
          </div>
          {refreshCounter > 0 && <div className="text-xs text-muted-foreground mt-1">Actualizado en tiempo real</div>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Clientes</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{loading ? "..." : stats.activeCustomers}</div>
        </CardContent>
      </Card>
    </div>
  )
}
