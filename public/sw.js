/**
 * Service Worker for Beauty Catalog Application
 * Optimized for Vercel deployment with security and performance focus
 * Version: 1.0.0
 */

const CACHE_NAME = "beauty-catalog-v1"
const OFFLINE_PAGE = "/offline.html"

// Define cacheable resources with security considerations
const STATIC_RESOURCES = [
  "/",
  "/offline.html",
  "/placeholder-logo.png",
  "/placeholder-logo.svg",
  "/placeholder.jpg",
  "/placeholder.svg",
  "/placeholder-user.jpg",
]

// API routes that are safe to cache (read-only, non-sensitive data)
const CACHEABLE_API_ROUTES = ["/api/products", "/api/categories", "/api/currencies"]

// Security: Routes to NEVER cache (sensitive or dynamic data)
const EXCLUDED_ROUTES = [
  "/api/auth",
  "/api/admin",
  "/api/upload",
  "/api/notifications/subscribe",
  "/api/notifications/broadcast",
  "/api/orders",
  "/api/customers",
  "/api/inventory",
  "/api/reports",
  "/api/socket",
  "/api/events",
  "/login",
  "/admin",
  "/user",
  "/profile",
  "/settings",
]

/**
 * Validates if a URL is safe to cache
 * Security: Prevents caching of sensitive routes and external origins
 */
function isSafeToCacheUrl(url) {
  try {
    const urlObj = new URL(url)

    // Only cache same-origin requests
    if (urlObj.origin !== self.location.origin) {
      return false
    }

    const pathname = urlObj.pathname

    // Exclude sensitive routes
    for (const excludedRoute of EXCLUDED_ROUTES) {
      if (pathname.startsWith(excludedRoute)) {
        return false
      }
    }

    // Exclude query parameters that might contain sensitive data
    if (urlObj.search.includes("token") || urlObj.search.includes("password") || urlObj.search.includes("session")) {
      return false
    }

    return true
  } catch (error) {
    console.error("[SW] URL validation error:", error)
    return false
  }
}

/**
 * Service Worker Installation
 * Pre-caches essential static resources
 */
self.addEventListener("install", (event) => {
  console.log("[SW] Installing service worker...")

  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        console.log("[SW] Caching static resources")
        return cache.addAll(STATIC_RESOURCES)
      })
      .then(() => {
        console.log("[SW] Installation complete")
        // Force activation of new service worker
        return self.skipWaiting()
      })
      .catch((error) => {
        console.error("[SW] Installation failed:", error)
      }),
  )
})

/**
 * Service Worker Activation
 * Cleans up old caches and claims clients
 */
self.addEventListener("activate", (event) => {
  console.log("[SW] Activating service worker...")

  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        // Delete old cache versions
        const deletePromises = cacheNames
          .filter((cacheName) => cacheName !== CACHE_NAME)
          .map((cacheName) => {
            console.log("[SW] Deleting old cache:", cacheName)
            return caches.delete(cacheName)
          })

        return Promise.all(deletePromises)
      })
      .then(() => {
        console.log("[SW] Activation complete")
        // Take control of all clients immediately
        return self.clients.claim()
      })
      .catch((error) => {
        console.error("[SW] Activation failed:", error)
      }),
  )
})

/**
 * Fetch Event Handler
 * Implements cache-first strategy for static resources and network-first for API calls
 */
self.addEventListener("fetch", (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Skip non-GET requests for security
  if (request.method !== "GET") {
    return
  }

  // Skip unsafe URLs
  if (!isSafeToCacheUrl(request.url)) {
    return
  }

  event.respondWith(
    handleFetchRequest(request, url).catch((error) => {
      console.error("[SW] Fetch error:", error)
      return handleOfflineFallback(request)
    }),
  )
})

/**
 * Handles fetch requests with appropriate caching strategy
 */
async function handleFetchRequest(request, url) {
  const pathname = url.pathname

  // Strategy 1: Cache-first for static resources and images
  if (isStaticResource(pathname)) {
    return handleCacheFirst(request)
  }

  // Strategy 2: Network-first for API calls (with cache fallback)
  if (pathname.startsWith("/api/") && isCacheableApiRoute(pathname)) {
    return handleNetworkFirst(request)
  }

  // Strategy 3: Network-first for HTML pages
  if (request.headers.get("accept")?.includes("text/html")) {
    return handleNetworkFirst(request)
  }

  // Default: Network only for uncategorized requests
  return fetch(request)
}

/**
 * Cache-first strategy: Check cache first, fallback to network
 */
async function handleCacheFirst(request) {
  const cachedResponse = await caches.match(request)

  if (cachedResponse) {
    console.log("[SW] Cache hit:", request.url)
    return cachedResponse
  }

  console.log("[SW] Cache miss, fetching:", request.url)
  const networkResponse = await fetch(request)

  // Cache successful responses
  if (networkResponse.ok) {
    const cache = await caches.open(CACHE_NAME)
    cache.put(request, networkResponse.clone())
  }

  return networkResponse
}

/**
 * Network-first strategy: Try network first, fallback to cache
 */
async function handleNetworkFirst(request) {
  try {
    const networkResponse = await fetch(request)

    // Cache successful responses for cacheable routes
    if (networkResponse.ok && isCacheableApiRoute(new URL(request.url).pathname)) {
      const cache = await caches.open(CACHE_NAME)
      cache.put(request, networkResponse.clone())
    }

    return networkResponse
  } catch (error) {
    console.log("[SW] Network failed, trying cache:", request.url)
    const cachedResponse = await caches.match(request)

    if (cachedResponse) {
      return cachedResponse
    }

    throw error
  }
}

/**
 * Handles offline fallback scenarios
 */
async function handleOfflineFallback(request) {
  // For HTML requests, show offline page
  if (request.headers.get("accept")?.includes("text/html")) {
    const offlineResponse = await caches.match(OFFLINE_PAGE)
    if (offlineResponse) {
      return offlineResponse
    }
  }

  // For other requests, return a basic offline response
  return new Response(
    JSON.stringify({
      error: "Offline",
      message: "This content is not available offline",
    }),
    {
      status: 503,
      statusText: "Service Unavailable",
      headers: { "Content-Type": "application/json" },
    },
  )
}

/**
 * Determines if a path is a static resource
 */
function isStaticResource(pathname) {
  return (
    pathname.match(/\.(js|css|png|jpg|jpeg|gif|svg|webp|ico|woff|woff2|ttf)$/i) ||
    pathname === "/" ||
    STATIC_RESOURCES.includes(pathname)
  )
}

/**
 * Determines if an API route is safe to cache
 */
function isCacheableApiRoute(pathname) {
  return CACHEABLE_API_ROUTES.some((route) => pathname.startsWith(route))
}

/**
 * Background Sync for offline actions (future enhancement)
 */
self.addEventListener("sync", (event) => {
  console.log("[SW] Background sync:", event.tag)

  if (event.tag === "background-sync") {
    event.waitUntil(handleBackgroundSync())
  }
})

/**
 * Handles background synchronization
 */
async function handleBackgroundSync() {
  try {
    // Implementation for syncing offline actions
    console.log("[SW] Performing background sync...")
    // This would sync any queued offline actions
  } catch (error) {
    console.error("[SW] Background sync failed:", error)
  }
}

/**
 * Push notification handler
 */
self.addEventListener("push", (event) => {
  if (!event.data) return

  try {
    const data = event.data.json()
    const options = {
      body: data.body,
      icon: "/placeholder-logo.png",
      badge: "/placeholder-logo.png",
      tag: data.tag || "default",
      requireInteraction: false,
      actions: data.actions || [],
    }

    event.waitUntil(self.registration.showNotification(data.title || "Beauty Catalog", options))
  } catch (error) {
    console.error("[SW] Push notification error:", error)
  }
})

/**
 * Notification click handler
 */
self.addEventListener("notificationclick", (event) => {
  event.notification.close()

  event.waitUntil(self.clients.openWindow(event.notification.data?.url || "/"))
})

console.log("[SW] Service Worker loaded successfully")
