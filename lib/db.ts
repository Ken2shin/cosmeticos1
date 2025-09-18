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
  sql = createMockSql()
}

function createMockSql() {
  const mockSql = (...args: any[]) => {
    console.warn("[Database] Mock SQL called - no real database connection")
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
  return databaseUrl !== null && databaseUrl !== undefined
}

export async function safeQuery(queryFn: () => Promise<any>, fallback: any = []) {
  if (!isDatabaseAvailable()) {
    console.warn("[Database] No database available, returning fallback")
    return fallback
  }

  try {
    return await queryFn()
  } catch (error) {
    console.error("[Database] Query failed:", error)
    return fallback
  }
}
