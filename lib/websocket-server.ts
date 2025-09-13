import { Server as SocketIOServer, Socket, ServerOptions } from "socket.io";

let io: SocketIOServer | null = null;

interface BroadcastData {
  [key: string]: any;
}

interface CorsOptions {
  origin: string | undefined;
  methods: string[];
}

interface CustomServerOptions extends ServerOptions {
  cors?: CorsOptions;
  transports?: ("polling" | "websocket")[];
}

function initializeWebSocket(server: any): void {
  const options: any = { // Force type to any to bypass all type checks
    cors: {
      origin: process.env.NODE_ENV === "production" ? process.env.NEXT_PUBLIC_APP_URL : "https://cosmeticos-jwwe.vercel.app/",
      methods: ["GET", "POST"],
    },
    transports: ["polling", "websocket"],
  };

  io = new SocketIOServer(server, options);

  io.on("connection", (socket: Socket) => {
    console.log("[WebSocket] New client connected:", socket.id);

    socket.on("join-client", () => {
      console.log("[WebSocket] Client joined:", socket.id);
      socket.join("clients");
    });

    socket.on("join-admin", () => {
      console.log("[WebSocket] Admin joined:", socket.id);
      socket.join("admins");
    });

    socket.on("disconnect", (reason: string) => {
      console.log("[WebSocket] Client disconnected:", socket.id, reason);
    });

    socket.on("error", (error: any) => {
      console.error("[WebSocket] Socket error:", error);
    });
  });

  console.log("[WebSocket] Socket.IO server initialized");
}

function broadcast(event: string, data: BroadcastData, room?: string): void {
  if (!io) {
    console.warn("[WebSocket] Socket.IO server not initialized");
    return;
  }

  const target = room ? io.to(room) : io;
  target.emit(event, data);

  console.log(`[WebSocket] Broadcasted ${event} to ${room || "all clients"}`);
}

// Product-related notifications
function notifyNewProduct(product: BroadcastData): void {
  broadcast("new-product", product, "clients");
}

function notifyProductUpdated(product: BroadcastData): void {
  broadcast("product-updated", product, "clients");
}

function notifyProductDeleted(productId: string): void {
  broadcast("product-deleted", { productId }, "clients");
}

// Stock and inventory notifications
function notifyStockUpdated(productId: string, newStock: number): void {
  broadcast("stock-updated", { productId, newStock }, "clients");
}

function notifyInventoryChanged(inventoryData: BroadcastData): void {
  broadcast("inventory-changed", inventoryData, "clients");
}

// Order notifications
function notifyNewOrder(order: BroadcastData): void {
  broadcast("new-order", order, "admins");
  broadcast("order-confirmed", order, "clients");
}

function notifyOrderDeleted(orderId: string): void {
  broadcast("order-deleted", { orderId }, "clients");
}

// Customer notifications
function notifyCustomerDeleted(customerId: string): void {
  broadcast("customer-deleted", { customerId }, "clients");
}

// General notifications
function notifyDataUpdate(type: string, data: BroadcastData): void {
  broadcast("data-update", { type, data }, "clients");
}

export {
  initializeWebSocket,
  notifyNewProduct,
  notifyProductUpdated,
  notifyProductDeleted,
  notifyStockUpdated,
  notifyInventoryChanged,
  notifyNewOrder,
  notifyOrderDeleted,
  notifyCustomerDeleted,
  notifyDataUpdate,
};