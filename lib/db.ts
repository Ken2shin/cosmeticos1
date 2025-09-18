import { neon } from "@neondatabase/serverless"

const databaseUrl = process.env.DATABASE_URL

export let sql: any

if (!databaseUrl) {
  console.warn("[v0] DATABASE_URL is not defined - database operations will fail gracefully")
  // Create a mock sql function that returns empty results
  const mockSql = () => Promise.resolve([])
  mockSql.transaction = () => Promise.resolve([])
  sql = mockSql
} else {
  sql = neon(databaseUrl)
}

// Helper function to test database connection
export async function testConnection() {
  try {
    if (!process.env.DATABASE_URL) {
      console.log("[v0] Database connection skipped - no DATABASE_URL")
      return false
    }
    const result = await sql`SELECT NOW() as current_time`
    console.log("[v0] Database connection successful:", result[0])
    return true
  } catch (error) {
    console.error("[v0] Database connection failed:", error)
    return false
  }
}
