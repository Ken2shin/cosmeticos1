export function validateDatabaseUrl(): string {
  const databaseUrl = process.env.DATABASE_URL

  if (!databaseUrl) {
    throw new Error("DATABASE_URL environment variable is not set. Please configure it in your production environment.")
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
