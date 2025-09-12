"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Calendar, Download, TrendingUp, DollarSign, Package, FileText } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface ReportData {
  summary: {
    total_orders: number
    total_revenue: number
    total_profit: number
    avg_profit_margin: number
  }
  topProducts: Array<{
    product_name: string
    total_sold: number
    total_revenue: number
    total_profit: number
  }>
  dateRange: {
    startDate: string
    endDate: string
  }
}

export function ReportsManagement() {
  const [startDate, setStartDate] = useState(() => {
    const now = new Date()
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
    return firstDay.toISOString().split("T")[0]
  })
  const [endDate, setEndDate] = useState(() => {
    const now = new Date()
    return now.toISOString().split("T")[0]
  })
  const [reportData, setReportData] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    if (startDate && endDate) {
      generateReport()
    }
  }, []) // Only run on mount

  const generateReport = async () => {
    if (!startDate || !endDate) {
      toast({
        title: "Fechas requeridas",
        description: "Por favor selecciona ambas fechas para generar el reporte.",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    try {
      console.log("[v0] Generating report for dates:", startDate, "to", endDate)

      const response = await fetch(`/api/reports/profits?startDate=${startDate}&endDate=${endDate}`)
      const data = await response.json()

      console.log("[v0] Report data received:", data)

      if (response.ok) {
        setReportData(data)
        if (loading) {
          toast({
            title: "✅ Reporte generado exitosamente",
            description: `Se encontraron ${data.summary.total_orders} pedidos con ingresos de C$${Number(data.summary.total_revenue).toFixed(2)}`,
            variant: "default",
          })
        }
      } else {
        throw new Error(data.error || "Error al generar reporte")
      }
    } catch (error) {
      console.error("[v0] Error generating report:", error)
      toast({
        title: "❌ Error al generar reporte",
        description:
          error instanceof Error
            ? error.message
            : "Error desconocido. Verifica que existan pedidos en el período seleccionado.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const downloadPDF = async () => {
    if (!startDate || !endDate) {
      toast({
        title: "Fechas requeridas",
        description: "Por favor selecciona ambas fechas para descargar el PDF.",
        variant: "destructive",
      })
      return
    }

    try {
      console.log("[v0] Starting PDF download for dates:", startDate, "to", endDate)

      toast({
        title: "Generando PDF...",
        description: "Preparando tu reporte completo, esto puede tomar unos segundos.",
        variant: "default",
      })

      const response = await fetch(`/api/reports/profits/pdf?startDate=${startDate}&endDate=${endDate}`)

      console.log("[v0] PDF response status:", response.status)
      console.log("[v0] PDF response headers:", response.headers.get("content-type"))

      if (!response.ok) {
        const errorText = await response.text()
        console.error("[v0] PDF generation failed:", errorText)
        throw new Error(`Error ${response.status}: Error al generar el reporte`)
      }

      const contentType = response.headers.get("content-type")

      if (contentType && contentType.includes("text/html")) {
        const htmlContent = await response.text()
        const newWindow = window.open("", "_blank")
        if (newWindow) {
          newWindow.document.write(htmlContent)
          newWindow.document.close()
          toast({
            title: "¡Reporte generado exitosamente!",
            description:
              "El PDF se ha abierto en una nueva ventana. Si no lo ves, verifica el bloqueador de ventanas emergentes.",
            variant: "success",
          })
        } else {
          throw new Error("No se pudo abrir la ventana del reporte. Verifica que no esté bloqueada por el navegador.")
        }
      } else {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const link = document.createElement("a")
        link.href = url
        link.download = `reporte-ganancias-${startDate}-${endDate}.pdf`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        window.URL.revokeObjectURL(url)
        toast({
          title: "¡Descarga completada!",
          description: "El reporte PDF se ha descargado exitosamente a tu dispositivo.",
          variant: "success",
        })
      }

      console.log("[v0] PDF download completed successfully")
    } catch (error) {
      console.error("[v0] Error downloading PDF:", error)
      const errorMessage = error instanceof Error ? error.message : "Error desconocido al descargar PDF"

      toast({
        title: "Error al generar PDF",
        description: `${errorMessage}. Por favor, intenta nuevamente o contacta al soporte técnico.`,
        variant: "destructive",
      })
    }
  }

  const getProfitColor = (profit: number) => {
    return profit >= 0 ? "text-green-600" : "text-red-600"
  }

  const getMarginColor = (margin: number) => {
    if (margin >= 50) return "text-green-600"
    if (margin >= 25) return "text-yellow-600"
    return "text-red-600"
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold bg-gradient-to-r from-rose-600 to-pink-600 bg-clip-text text-transparent">
          Reportes y Análisis
        </h2>
      </div>

      {/* Date Range Selector */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Seleccionar Período
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div>
              <Label htmlFor="startDate">Fecha Inicio</Label>
              <Input id="startDate" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="endDate">Fecha Fin</Label>
              <Input id="endDate" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
            <div className="flex gap-2">
              <Button
                onClick={generateReport}
                disabled={loading}
                className="bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700"
              >
                {loading ? "Generando..." : "Generar Reporte"}
              </Button>
              <Button onClick={downloadPDF} variant="outline" disabled={!startDate || !endDate}>
                <Download className="w-4 h-4 mr-2" />
                Descargar PDF
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Report Results */}
      {reportData && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Pedidos</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{reportData.summary.total_orders}</div>
                <p className="text-xs text-muted-foreground">
                  Período: {new Date(reportData.dateRange.startDate).toLocaleDateString()} -{" "}
                  {new Date(reportData.dateRange.endDate).toLocaleDateString()}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Ingresos Totales</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  C${Number(reportData.summary.total_revenue).toFixed(2)}
                </div>
                <p className="text-xs text-muted-foreground">Ventas brutas del período</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Ganancia Total</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${getProfitColor(reportData.summary.total_profit)}`}>
                  C${Number(reportData.summary.total_profit).toFixed(2)}
                </div>
                <p className="text-xs text-muted-foreground">Ganancia neta del período</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Margen Promedio</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${getMarginColor(reportData.summary.avg_profit_margin)}`}>
                  {Number(reportData.summary.avg_profit_margin).toFixed(1)}%
                </div>
                <p className="text-xs text-muted-foreground">Margen de ganancia promedio</p>
              </CardContent>
            </Card>
          </div>

          {/* Top Products */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                Productos Más Vendidos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-3 font-semibold">Producto</th>
                      <th className="text-center p-3 font-semibold">Cantidad</th>
                      <th className="text-right p-3 font-semibold">Ingresos</th>
                      <th className="text-right p-3 font-semibold">Ganancia</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.topProducts.map((product, index) => (
                      <tr key={index} className="border-b hover:bg-gray-50">
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{index + 1}</Badge>
                            <span className="font-medium">{product.product_name}</span>
                          </div>
                        </td>
                        <td className="p-3 text-center">{product.total_sold}</td>
                        <td className="p-3 text-right font-semibold text-blue-600">
                          C${Number(product.total_revenue).toFixed(2)}
                        </td>
                        <td className={`p-3 text-right font-semibold ${getProfitColor(product.total_profit)}`}>
                          C${Number(product.total_profit).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Download Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Exportar Reporte
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Reporte Completo en PDF</p>
                  <p className="text-sm text-muted-foreground">
                    Incluye resumen ejecutivo, análisis detallado y gráficos
                  </p>
                </div>
                <Button onClick={downloadPDF} className="bg-gradient-to-r from-rose-500 to-pink-600">
                  <Download className="w-4 h-4 mr-2" />
                  Descargar PDF
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {!reportData && !loading && (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gradient-to-br from-rose-100 to-pink-100 rounded-full flex items-center justify-center mb-4 mx-auto">
            <Calendar className="h-8 w-8 text-rose-500" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Generar Reporte de Ganancias</h3>
          <p className="text-muted-foreground mb-4">
            Selecciona un rango de fechas para analizar tus ganancias y descargar reportes detallados
          </p>
        </div>
      )}
    </div>
  )
}
