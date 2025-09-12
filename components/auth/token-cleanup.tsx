"use client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertTriangle, RefreshCw } from "lucide-react"

export function TokenCleanup() {
  const clearTokensAndRedirect = () => {
    if (typeof window === "undefined") return

    // Clear all possible admin tokens
    document.cookie = "admin-token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;"
    document.cookie = "admin-token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=" + window.location.hostname

    // Clear any localStorage items that might interfere
    localStorage.clear()
    sessionStorage.clear()

    console.log("[v0] All tokens and storage cleared")

    // Force redirect to login
    window.location.href = "/admin/login"
  }

  return (
    <Card className="max-w-md mx-auto mt-8 border-orange-200 bg-orange-50/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-orange-700">
          <AlertTriangle className="h-5 w-5" />
          Problemas de Autenticación
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-orange-600">
          Si estás experimentando problemas de autenticación o redirecciones incorrectas, puedes limpiar todos los
          tokens y empezar de nuevo.
        </p>
        <Button
          onClick={clearTokensAndRedirect}
          variant="outline"
          className="w-full border-orange-300 text-orange-700 hover:bg-orange-100 bg-transparent"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Limpiar Tokens y Reiniciar
        </Button>
      </CardContent>
    </Card>
  )
}
