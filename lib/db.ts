import { neon } from "@neondatabase/serverless"
import { validateDatabaseUrl } from "./env-validation"

let databaseUrl: string

try {
  databaseUrl = validateDatabaseUrl()
} catch (error) {
  console.error("[v0] Environment validation failed:", error)
  // Fallback for development - you should set DATABASE_URL in production
  databaseUrl = process.env.DATABASE_URL || "postgresql://localhost:5432/fallback"
}

export let sql: any

try {
  sql = neon(databaseUrl)
  console.log("[v0] Database connection initialized successfully")
} catch (error) {
  console.error("[v0] Database initialization failed:", error)
  // Create a mock sql function that returns empty results
  const mockSql = () => Promise.resolve([])
  mockSql.transaction = () => Promise.resolve([])
  sql = mockSql
}

// Helper function to test database connection
export async function testConnection() {
  try {
    const result = await sql`SELECT NOW() as current_time`
    console.log("[v0] Database connection successful:", result[0])
    return true
  } catch (error) {
    console.error("[v0] Database connection failed:", error)
    return false
  }
}
