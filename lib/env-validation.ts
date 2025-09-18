export function validateDatabaseUrl(): string {
  const databaseUrl = process.env.DATABASE_URL

  if (!databaseUrl) {
    throw new Error("DATABASE_URL environment variable is not set. Please configure it in your production environment.")
  }

  if (!databaseUrl.startsWith("postgresql://") && !databaseUrl.startsWith("postgres://")) {
    throw new Error(
      "DATABASE_URL must be a valid PostgreSQL connection string starting with postgresql:// or postgres://",
    )
  }

  return databaseUrl
}

export function validateRequiredEnvVars() {
  const required = ["DATABASE_URL"]
  const missing = required.filter((key) => !process.env[key])

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`)
  }
}

export function getDatabaseUrl(): string | null {
  const databaseUrl = process.env.DATABASE_URL

  if (!databaseUrl) {
    console.warn("[Database] DATABASE_URL environment variable is not set")
    return null
  }

  if (!databaseUrl.startsWith("postgresql://") && !databaseUrl.startsWith("postgres://")) {
    console.warn("[Database] DATABASE_URL should be a valid PostgreSQL connection string")
    return null
  }

  return databaseUrl
}
