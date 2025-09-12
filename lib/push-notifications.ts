export interface PushSubscription {
  endpoint: string
  keys: {
    p256dh: string
    auth: string
  }
}

export class PushNotificationService {
  private static instance: PushNotificationService

  static getInstance(): PushNotificationService {
    if (!PushNotificationService.instance) {
      PushNotificationService.instance = new PushNotificationService()
    }
    return PushNotificationService.instance
  }

  async requestPermission(): Promise<NotificationPermission> {
    if (!("Notification" in window)) {
      throw new Error("Este navegador no soporta notificaciones")
    }

    if (Notification.permission === "default") {
      return await Notification.requestPermission()
    }

    return Notification.permission
  }

  async subscribeToPush(): Promise<PushSubscription | null> {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      console.warn("Push messaging no está soportado")
      return null
    }

    try {
      const registration = await navigator.serviceWorker.register("/sw.js")
      await navigator.serviceWorker.ready

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || ""),
      })

      return {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: btoa(String.fromCharCode(...new Uint8Array(subscription.getKey("p256dh")!))),
          auth: btoa(String.fromCharCode(...new Uint8Array(subscription.getKey("auth")!))),
        },
      }
    } catch (error) {
      console.error("Error al suscribirse a push notifications:", error)
      return null
    }
  }

  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4)
    const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/")

    if (typeof window === "undefined") {
      return new Uint8Array(0)
    }

    const rawData = window.atob(base64)
    const outputArray = new Uint8Array(rawData.length)

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i)
    }
    return outputArray
  }

  async sendNotification(title: string, body: string, data?: any): Promise<void> {
    if (Notification.permission === "granted") {
      new Notification(title, {
        body,
        icon: "/icon-192x192.png",
        badge: "/icon-192x192.png",
        data,
        requireInteraction: true,
        actions: [
          {
            action: "view",
            title: "Ver Pedido",
          },
          {
            action: "dismiss",
            title: "Cerrar",
          },
        ],
      })
    }
  }
}
