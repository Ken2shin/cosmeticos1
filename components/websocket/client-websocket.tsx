"use client";

import React, { useEffect, useRef } from "react";
import { io, type Socket } from "socket.io-client";
import { useToast } from "@/hooks/use-toast";

export function ClientWebSocket() {
  const socketRef = useRef<Socket | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const initializeSocket = () => {
      const socketUrl =
        typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";

      console.log("[v0] Initializing WebSocket connection to:", socketUrl);

      socketRef.current = io(socketUrl, {
        transports: ["websocket", "polling"],
        timeout: 10000,
        forceNew: true,
        reconnection: true,
        reconnectionDelay: 1000,
        // reconnectionAttempts es válido; eliminamos maxReconnectionAttempts que causa el error TS
        reconnectionAttempts: 5,
      });

      const socket = socketRef.current;

      const onConnect = () => {
        console.log("[v0] Client WebSocket connected:", socket.id);
        socket.emit("join-client");
      };

      const onDisconnect = (reason: any) => {
        console.log("[v0] Client WebSocket disconnected:", reason);
      };

      const onNewProduct = (productData: any) => {
        console.log("[v0] New product received:", productData);
        window.dispatchEvent(new CustomEvent("productCreated", { detail: productData }));
        toast({
          title: "Nuevo producto disponible",
          description: `${productData.name} ha sido agregado al catálogo`,
          variant: "default",
        });
      };

      // registra listeners
      socket.on("connect", onConnect);
      socket.on("disconnect", onDisconnect);
      socket.on("new-product", onNewProduct);

      socket.on("product-updated", (productData: any) => {
        console.log("[v0] Product updated:", productData);
        window.dispatchEvent(new CustomEvent("productUpdated", { detail: productData }));
      });

      socket.on("product-deleted", ({ productId }: { productId: string }) => {
        console.log("[v0] Product deleted:", productId);
        window.dispatchEvent(new CustomEvent("productDeleted", { detail: { productId } }));
      });

      socket.on("stock-updated", ({ productId, newStock }: { productId: string; newStock: number }) => {
        console.log("[v0] Stock updated:", { productId, newStock });
        window.dispatchEvent(new CustomEvent("stockUpdated", { detail: { productId, newStock } }));
      });

      socket.on("inventory-changed", (inventoryData: any) => {
        console.log("[v0] Inventory changed:", inventoryData);
        window.dispatchEvent(new CustomEvent("inventoryChanged", { detail: inventoryData }));
      });

      socket.on("order-confirmed", (orderData: any) => {
        console.log("[v0] Order confirmed:", orderData);
        toast({
          title: "Pedido confirmado",
          description: `Tu pedido #${orderData.id} ha sido confirmado`,
          variant: "default",
        });
      });

      socket.on("connect_error", (error: any) => {
        if (error?.message === "timeout") {
          console.log("[v0] WebSocket connection error: timeout");
        } else {
          console.error("[v0] WebSocket connection error:", error);
        }
      });

      socket.on("error", (error: any) => {
        console.error("[v0] WebSocket error:", error);
      });

      socket.on("reconnect", (attemptNumber: number) => {
        console.log("[v0] WebSocket reconnected after", attemptNumber, "attempts");
      });

      socket.on("reconnect_error", (error: any) => {
        console.log("[v0] WebSocket reconnection failed:", error?.message ?? error);
      });
    };

    initializeSocket();

    return () => {
      if (socketRef.current) {
        console.log("[v0] Cleaning up client WebSocket connection");
        // remover listeners y desconectar
        socketRef.current.off(); // quita todos los listeners registrados en este socket
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [toast]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      // preferimos chequear connected para mayor claridad
      if (document.visibilityState === "visible" && socketRef.current && socketRef.current.connected === false) {
        console.log("[v0] Page became visible, reconnecting WebSocket");
        socketRef.current.connect();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  return null;
}
