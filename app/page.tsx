import { Suspense } from "react"
import { ProductCatalog } from "@/components/product-catalog"
import { Hero } from "@/components/hero"
import { Header } from "@/components/header" // Added header import
import { NotificationPermission } from "@/components/notifications/notification-permission"
import { ClientWebSocket } from "@/components/websocket/client-websocket"
import { ClientNotificationModule } from "@/components/notifications/client-notification-module"

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <Hero />
      <main className="container mx-auto px-4 py-8">
        <NotificationPermission userType="client" />

        <Suspense fallback={<div className="text-center py-8">Cargando productos...</div>}>
          <ProductCatalog />
        </Suspense>

        <ClientWebSocket />
      </main>

      <ClientNotificationModule />
    </div>
  )
}
