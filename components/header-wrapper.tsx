"use client"

import { Header } from "@/components/header"
import { useAuth } from "@/components/auth/auth-provider"

export function HeaderWrapper() {
  const { isLoading } = useAuth()

  if (isLoading) {
    return (
      <header className="sticky top-0 z-50 w-full border-b bg-white/80 backdrop-blur-md h-16">
        <div className="container mx-auto flex h-16 items-center justify-center px-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-rose-600"></div>
        </div>
      </header>
    )
  }

  return <Header />
}
