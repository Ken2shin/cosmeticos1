"use client"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ProductManagement } from "@/components/admin/product-management"
import { OrderManagement } from "@/components/admin/order-management"
import { CustomerManagement } from "@/components/admin/customer-management"
import { InventoryManagement } from "@/components/admin/inventory-management"
import { ReportsManagement } from "@/components/admin/reports-management"
import { DashboardStats } from "@/components/admin/dashboard-stats"

export function AdminDashboard() {
  return (
    <div className="space-y-8">
      <DashboardStats />

      <Tabs defaultValue="products" className="w-full">
        <TabsList className="grid w-full grid-cols-5 bg-white/50 backdrop-blur-sm">
          <TabsTrigger
            value="products"
            className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-rose-500 data-[state=active]:to-pink-600 data-[state=active]:text-white transition-all duration-300"
          >
            Productos
          </TabsTrigger>
          <TabsTrigger
            value="orders"
            className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-rose-500 data-[state=active]:to-pink-600 data-[state=active]:text-white transition-all duration-300"
          >
            Pedidos
          </TabsTrigger>
          <TabsTrigger
            value="customers"
            className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-rose-500 data-[state=active]:to-pink-600 data-[state=active]:text-white transition-all duration-300"
          >
            Clientes
          </TabsTrigger>
          <TabsTrigger
            value="inventory"
            className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-rose-500 data-[state=active]:to-pink-600 data-[state=active]:text-white transition-all duration-300"
          >
            Inventario
          </TabsTrigger>
          <TabsTrigger
            value="reports"
            className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-rose-500 data-[state=active]:to-pink-600 data-[state=active]:text-white transition-all duration-300"
          >
            Reportes
          </TabsTrigger>
        </TabsList>

        <TabsContent value="products" className="space-y-4 animate-in fade-in-0 slide-in-from-right-4 duration-500">
          <ProductManagement />
        </TabsContent>

        <TabsContent value="orders" className="space-y-4 animate-in fade-in-0 slide-in-from-right-4 duration-500">
          <OrderManagement />
        </TabsContent>

        <TabsContent value="customers" className="space-y-4 animate-in fade-in-0 slide-in-from-right-4 duration-500">
          <CustomerManagement />
        </TabsContent>

        <TabsContent value="inventory" className="space-y-4 animate-in fade-in-0 slide-in-from-right-4 duration-500">
          <InventoryManagement />
        </TabsContent>

        <TabsContent value="reports" className="space-y-4 animate-in fade-in-0 slide-in-from-right-4 duration-500">
          <ReportsManagement />
        </TabsContent>
      </Tabs>
    </div>
  )
}
