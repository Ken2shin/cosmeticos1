"use client"

import { useEffect, useState } from "react"
import { NotificationPermission } from "./notification-permission"

export function ClientNotificationModule() {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    // Show notification module after a short delay
    const timer = setTimeout(() => {
      setIsVisible(true)
    }, 2000)

    return () => clearTimeout(timer)
  }, [])

  if (!isVisible) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm">
      <NotificationPermission userType="client" />
    </div>
  )
}
