import { neon } from "@neondatabase/serverless"
import { getDatabaseUrl } from "./env-validation"

const databaseUrl = getDatabaseUrl()

export let sql: any

if (databaseUrl) {
  try {
    sql = neon(databaseUrl)
    console.log("[v0] Database connection initialized successfully")
  } catch (error) {
    console.error("[v0] Database initialization failed:", error)
    sql = createMockSql()
  }
} else {
  console.warn("[v0] No valid DATABASE_URL found, using mock database functions")
  console.warn("[v0] To fix this: Add DATABASE_URL=postgresql://... to your environment variables")
  sql = createMockSql()
}

function createMockSql() {
  const mockSql = (...args: any[]) => {
    console.warn("[Database] Mock SQL called - no real database connection")
    console.warn("[Database] Add DATABASE_URL environment variable to connect to real database")
    return Promise.resolve([])
  }

  // Add transaction support for mock
  mockSql.transaction = (...args: any[]) => {
    console.warn("[Database] Mock transaction called - no real database connection")
    return Promise.resolve([])
  }

  return mockSql
}

export async function testConnection() {
  if (!databaseUrl) {
    console.warn("[v0] Cannot test connection - no DATABASE_URL configured")
    console.warn("[v0] Add DATABASE_URL=postgresql://username:password@host:port/database to your .env.local file")
    return false
  }

  try {
    const result = await sql`SELECT NOW() as current_time`
    console.log("[v0] Database connection successful:", result[0])
    return true
  } catch (error) {
    console.error("[v0] Database connection failed:", error)
    return false
  }
}

export function isDatabaseAvailable(): boolean {
  const hasUrl = databaseUrl !== null && databaseUrl !== undefined && databaseUrl.trim() !== ""
  console.log("[v0] Database availability check:", { hasUrl, databaseUrl: databaseUrl ? "present" : "missing" })
  return hasUrl
}

export async function safeQuery(queryFn: () => Promise<any>, fallback: any = []) {
  if (!isDatabaseAvailable()) {
    console.warn("[Database] No database available, returning fallback")
    console.warn("[Database] To connect to real database, add DATABASE_URL environment variable")
    return fallback
  }

  try {
    const result = await queryFn()
    console.log("[Database] Query successful, returned", Array.isArray(result) ? result.length : "non-array", "items")
    return result
  } catch (error) {
    console.error("[Database] Query failed, using fallback:", error)
    return fallback
  }
}
