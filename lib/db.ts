import { neon } from "@neondatabase/serverless"

const databaseUrl =
  "postgresql://ondb_owner:npg_fVPDrJ0bN3cC@ep-twilight-math-ad6ilsdl-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require"

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
