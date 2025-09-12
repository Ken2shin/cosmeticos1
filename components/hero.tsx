import { Button } from "@/components/ui/button"
import { Sparkles, Star } from "lucide-react"

export function Hero() {
  return (
    <section className="relative bg-gradient-to-br from-rose-50 via-pink-50 to-white py-20 overflow-hidden">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-rose-200/30 to-pink-200/30 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-pink-200/30 to-rose-200/30 rounded-full blur-3xl animate-pulse delay-1000" />
        <Sparkles className="absolute top-20 left-20 w-6 h-6 text-rose-300 animate-bounce delay-500" />
        <Star className="absolute top-40 right-32 w-4 h-4 text-pink-300 animate-pulse delay-700" />
        <Sparkles className="absolute bottom-32 left-1/4 w-5 h-5 text-rose-400 animate-bounce delay-1000" />
      </div>

      <div className="container mx-auto px-4 text-center relative z-10">
        <h1 className="text-4xl md:text-6xl font-bold mb-6 text-balance animate-in fade-in-0 slide-in-from-bottom-6 duration-1000">
          <span className="bg-gradient-to-r from-rose-600 via-pink-600 to-rose-700 bg-clip-text text-transparent">
            Descubre tu Belleza
          </span>
          <br />
          <span className="text-gray-800">Natural</span>
        </h1>

        <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto text-pretty animate-in fade-in-0 slide-in-from-bottom-8 duration-1000 delay-300">
          Explora nuestra colección exclusiva de productos de maquillaje de alta calidad para realzar tu belleza única.
        </p>

        <div className="animate-in fade-in-0 slide-in-from-bottom-10 duration-1000 delay-500">
          <Button
            size="lg"
            className="text-lg px-8 py-4 bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 transition-all duration-300 transform hover:scale-105 active:scale-95 shadow-lg hover:shadow-xl"
          >
            <Sparkles className="w-5 h-5 mr-2" />
            Explorar Productos
          </Button>
        </div>

        <div className="mt-12 flex justify-center space-x-8 animate-in fade-in-0 slide-in-from-bottom-12 duration-1000 delay-700">
          <div className="text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-rose-100 to-pink-100 rounded-full flex items-center justify-center mb-2 mx-auto animate-bounce delay-100">
              <Sparkles className="w-8 h-8 text-rose-500" />
            </div>
            <p className="text-sm text-muted-foreground font-medium">Calidad Premium</p>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-pink-100 to-rose-100 rounded-full flex items-center justify-center mb-2 mx-auto animate-bounce delay-300">
              <Star className="w-8 h-8 text-pink-500" />
            </div>
            <p className="text-sm text-muted-foreground font-medium">Marcas Exclusivas</p>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-rose-100 to-pink-100 rounded-full flex items-center justify-center mb-2 mx-auto animate-bounce delay-500">
              <Sparkles className="w-8 h-8 text-rose-500" />
            </div>
            <p className="text-sm text-muted-foreground font-medium">Envío Gratis</p>
          </div>
        </div>
      </div>
    </section>
  )
}
