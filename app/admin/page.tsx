"use client"

import { AdminDashboard } from "@/components/admin/admin-dashboard"
import { AdminHeader } from "@/components/admin/admin-header"
import { NotificationPermission } from "@/components/notifications/notification-permission"
import { AdminWebSocket } from "@/components/websocket/admin-websocket"

export default function AdminPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50/50 to-pink-50/50">
      <AdminHeader />
      <main className="container mx-auto px-4 py-8">
        <NotificationPermission userType="admin" />

        <div className="animate-in fade-in-0 slide-in-from-bottom-4 duration-700">
          <AdminDashboard />
        </div>

        <AdminWebSocket />
      </main>
    </div>
  )
}
