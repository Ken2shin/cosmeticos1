"use client"

import { useEffect, useRef, useState } from "react"

export function useSSE(url: string) {
  const [isConnected, setIsConnected] = useState(false)
  const [lastMessage, setLastMessage] = useState<any>(null)
  const eventSourceRef = useRef<EventSource | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const reconnectAttempts = useRef(0)
  const maxReconnectAttempts = 5

  const connect = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
    }

    try {
      if (!url || typeof url !== "string") {
        console.warn("[SSE] Invalid URL provided, skipping connection")
        return
      }

      const eventSource = new EventSource(url)
      eventSourceRef.current = eventSource

      eventSource.onopen = () => {
        console.log("[SSE] Connected to server")
        setIsConnected(true)
        reconnectAttempts.current = 0
      }

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          setLastMessage(data)
        } catch (error) {
          console.warn("[SSE] Error parsing message:", error)
        }
      }

      eventSource.onerror = (error) => {
        console.warn("[SSE] Connection error, attempting to reconnect...")
        setIsConnected(false)

        if (eventSource.readyState === EventSource.CLOSED) {
          console.log("[SSE] Connection permanently closed")
          return
        }

        eventSource.close()

        // Attempt to reconnect with exponential backoff
        if (reconnectAttempts.current < maxReconnectAttempts) {
          reconnectAttempts.current++
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000)

          reconnectTimeoutRef.current = setTimeout(() => {
            connect()
          }, delay)
        } else {
          console.log("[SSE] Max reconnection attempts reached")
        }
      }
    } catch (error) {
      console.warn("[SSE] Failed to create EventSource, will retry later")
      setIsConnected(false)
    }
  }

  useEffect(() => {
    if (url && typeof url === "string") {
      connect()
    }

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
    }
  }, [url])

  const disconnect = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
    }
    setIsConnected(false)
    reconnectAttempts.current = 0
  }

  return { isConnected, lastMessage, disconnect }
}
