"use client"

import Link from "next/link"
import { Search, User, Sparkles, Settings } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { CartSidebar } from "@/components/cart/cart-sidebar"
import { useAuth } from "@/components/auth/auth-provider"
import { useState } from "react"

interface HeaderProps {
  onSearchChange?: (searchTerm: string) => void
}

export function Header({ onSearchChange }: HeaderProps) {
  const { isAdmin } = useAuth()
  const [searchTerm, setSearchTerm] = useState("")

  const handleSearchChange = (value: string) => {
    setSearchTerm(value)
    if (onSearchChange) {
      onSearchChange(value)
    }
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white/80 backdrop-blur-md supports-[backdrop-filter]:bg-white/60 animate-in slide-in-from-top-4 duration-1000">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link href="/" className="flex items-center space-x-2 group">
          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <span className="text-xl font-bold bg-gradient-to-r from-rose-600 to-pink-600 bg-clip-text text-transparent group-hover:from-rose-700 group-hover:to-pink-700 transition-all duration-300">
            Beauty Catalog
          </span>
        </Link>

        <div className="flex-1 max-w-md mx-8">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground group-focus-within:text-rose-500 transition-colors duration-200" />
            <Input
              placeholder="Buscar productos..."
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-10 transition-all duration-200 focus:ring-2 focus:ring-rose-500 focus:border-rose-500 hover:border-rose-300"
            />
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <CartSidebar />
          {isAdmin && (
            <Link href="/admin" prefetch={true} aria-label="Panel de Administrador">
              <Button
                variant="ghost"
                size="sm"
                className="hover:bg-rose-50 hover:text-rose-600 transition-all duration-200 hover:scale-105 flex items-center space-x-1"
              >
                <Settings className="h-4 w-4" />
                <span className="hidden sm:inline">Administrador</span>
              </Button>
            </Link>
          )}
          <Link href="/admin/login" aria-label="Iniciar Sesión">
            <Button
              variant="ghost"
              size="icon"
              className="hover:bg-rose-50 hover:text-rose-600 transition-all duration-200 hover:scale-110"
            >
              <User className="h-5 w-5" />
            </Button>
          </Link>
        </div>
      </div>
    </header>
  )
}
