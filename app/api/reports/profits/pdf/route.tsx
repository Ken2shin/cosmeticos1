import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function GET(request: NextRequest) {
  try {
    console.log("[v0] Starting PDF generation process...")

    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")

    console.log("[v0] Received dates:", { startDate, endDate })

    if (!startDate || !endDate) {
      console.error("[v0] Missing required dates")
      return NextResponse.json({ error: "Fechas de inicio y fin son requeridas" }, { status: 400 })
    }

    let summary, topProducts, dailyStats, categoryStats, topCustomers

    try {
      console.log("[v0] Executing summary query...")
      summary = await sql`
        SELECT 
          COALESCE(COUNT(DISTINCT o.id), 0) as total_orders,
          COALESCE(SUM(o.total_amount), 0) as total_revenue,
          COALESCE(SUM(pt.total_profit), 0) as total_profit,
          COALESCE(AVG(pt.profit_margin_percent), 0) as avg_profit_margin,
          COALESCE(COUNT(DISTINCT o.customer_email), 0) as unique_customers,
          COALESCE(SUM(oi.quantity), 0) as total_items_sold
        FROM orders o
        LEFT JOIN order_items oi ON o.id = oi.order_id
        LEFT JOIN profit_tracking pt ON o.id = pt.order_id
        WHERE o.created_at >= ${startDate}::date 
          AND o.created_at <= ${endDate}::date + INTERVAL '1 day'
          AND o.status = 'completed'
      `
      console.log("[v0] Summary query completed")
    } catch (error) {
      console.error("[v0] Summary query failed:", error)
      summary = [
        {
          total_orders: 0,
          total_revenue: 0,
          total_profit: 0,
          avg_profit_margin: 0,
          unique_customers: 0,
          total_items_sold: 0,
        },
      ]
    }

    try {
      console.log("[v0] Executing top products query...")
      topProducts = await sql`
        SELECT 
          COALESCE(p.name, 'Producto sin nombre') as product_name,
          COALESCE(p.brand, 'Sin marca') as brand,
          COALESCE(SUM(oi.quantity), 0) as total_sold,
          COALESCE(SUM(oi.total_price), 0) as total_revenue,
          COALESCE(SUM(pt.total_profit), 0) as total_profit,
          COALESCE(AVG(pt.profit_margin_percent), 0) as avg_profit_margin,
          COALESCE(COUNT(DISTINCT o.id), 0) as orders_count
        FROM orders o
        LEFT JOIN order_items oi ON o.id = oi.order_id
        LEFT JOIN products p ON oi.product_id = p.id
        LEFT JOIN profit_tracking pt ON o.id = pt.order_id AND oi.product_id = pt.product_id
        WHERE o.created_at >= ${startDate}::date 
          AND o.created_at <= ${endDate}::date + INTERVAL '1 day'
          AND o.status = 'completed'
        GROUP BY p.id, p.name, p.brand
        ORDER BY total_sold DESC
        LIMIT 10
      `
      console.log("[v0] Top products query completed")
    } catch (error) {
      console.error("[v0] Top products query failed:", error)
      topProducts = []
    }

    try {
      console.log("[v0] Executing daily stats query...")
      dailyStats = await sql`
        SELECT 
          DATE(o.created_at) as date,
          COALESCE(COUNT(DISTINCT o.id), 0) as orders_count,
          COALESCE(SUM(o.total_amount), 0) as revenue,
          COALESCE(SUM(pt.total_profit), 0) as profit,
          COALESCE(COUNT(DISTINCT o.customer_email), 0) as unique_customers,
          COALESCE(SUM(oi.quantity), 0) as items_sold
        FROM orders o
        LEFT JOIN order_items oi ON o.id = oi.order_id
        LEFT JOIN profit_tracking pt ON o.id = pt.order_id
        WHERE o.created_at >= ${startDate}::date 
          AND o.created_at <= ${endDate}::date + INTERVAL '1 day'
          AND o.status = 'completed'
        GROUP BY DATE(o.created_at)
        ORDER BY date DESC
        LIMIT 30
      `
      console.log("[v0] Daily stats query completed")
    } catch (error) {
      console.error("[v0] Daily stats query failed:", error)
      dailyStats = []
    }

    try {
      console.log("[v0] Executing category stats query...")
      categoryStats = await sql`
        SELECT 
          COALESCE(c.name, 'Sin categoría') as category_name,
          COALESCE(COUNT(DISTINCT oi.product_id), 0) as products_count,
          COALESCE(SUM(oi.quantity), 0) as total_sold,
          COALESCE(SUM(oi.total_price), 0) as total_revenue,
          COALESCE(SUM(pt.total_profit), 0) as total_profit,
          COALESCE(AVG(pt.profit_margin_percent), 0) as avg_profit_margin
        FROM orders o
        LEFT JOIN order_items oi ON o.id = oi.order_id
        LEFT JOIN products p ON oi.product_id = p.id
        LEFT JOIN categories c ON p.category_id = c.id
        LEFT JOIN profit_tracking pt ON o.id = pt.order_id AND oi.product_id = pt.product_id
        WHERE o.created_at >= ${startDate}::date 
          AND o.created_at <= ${endDate}::date + INTERVAL '1 day'
          AND o.status = 'completed'
        GROUP BY c.id, c.name
        ORDER BY total_revenue DESC
        LIMIT 10
      `
      console.log("[v0] Category stats query completed")
    } catch (error) {
      console.error("[v0] Category stats query failed:", error)
      categoryStats = []
    }

    try {
      console.log("[v0] Executing top customers query...")
      topCustomers = await sql`
        SELECT 
          COALESCE(o.customer_name, 'Cliente sin nombre') as customer_name,
          COALESCE(o.customer_email, 'Sin email') as customer_email,
          COALESCE(COUNT(DISTINCT o.id), 0) as total_orders,
          COALESCE(SUM(o.total_amount), 0) as total_spent,
          COALESCE(SUM(pt.total_profit), 0) as total_profit_generated,
          COALESCE(AVG(o.total_amount), 0) as avg_order_value
        FROM orders o
        LEFT JOIN profit_tracking pt ON o.id = pt.order_id
        WHERE o.created_at >= ${startDate}::date 
          AND o.created_at <= ${endDate}::date + INTERVAL '1 day'
          AND o.status = 'completed'
        GROUP BY o.customer_name, o.customer_email
        ORDER BY total_spent DESC
        LIMIT 10
      `
      console.log("[v0] Top customers query completed")
    } catch (error) {
      console.error("[v0] Top customers query failed:", error)
      topCustomers = []
    }

    const summaryData = summary[0] || {
      total_orders: 0,
      total_revenue: 0,
      total_profit: 0,
      avg_profit_margin: 0,
      unique_customers: 0,
      total_items_sold: 0,
    }

    console.log("[v0] Generating HTML report...")

    const html = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reporte Completo de Ganancias - Beauty Catalog</title>
        <style>
            * { 
                margin: 0; 
                padding: 0; 
                box-sizing: border-box; 
            }
            
            body { 
                font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; 
                line-height: 1.6; 
                color: #1f2937;
                background: linear-gradient(135deg, #fdf2f8 0%, #fce7f3 100%);
                min-height: 100vh;
            }
            
            .container { 
                max-width: 1000px; 
                margin: 20px auto; 
                padding: 40px;
                background: white;
                box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
                border-radius: 20px;
                border: 1px solid #f3e8ff;
            }
            
            .header { 
                text-align: center; 
                margin-bottom: 50px;
                padding-bottom: 30px;
                border-bottom: 4px solid #ec4899;
                position: relative;
            }
            
            .header::after {
                content: '';
                position: absolute;
                bottom: -4px;
                left: 50%;
                transform: translateX(-50%);
                width: 100px;
                height: 4px;
                background: linear-gradient(90deg, #ec4899, #be185d);
                border-radius: 2px;
            }
            
            .header h1 { 
                background: linear-gradient(135deg, #ec4899, #be185d, #831843);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                background-clip: text;
                font-size: 3.5rem;
                font-weight: 900;
                margin-bottom: 15px;
                letter-spacing: -0.025em;
            }
            
            .header .subtitle {
                color: #6b7280;
                font-size: 1.4rem;
                font-weight: 600;
                text-transform: uppercase;
                letter-spacing: 0.1em;
            }
            
            .date-range {
                background: linear-gradient(135deg, #fdf2f8, #fce7f3, #fbcfe8);
                padding: 30px;
                border-radius: 16px;
                text-align: center;
                margin-bottom: 40px;
                border: 3px solid #f9a8d4;
                box-shadow: 0 10px 25px -5px rgba(236, 72, 153, 0.1);
            }
            
            .date-range h2 {
                color: #be185d;
                margin-bottom: 15px;
                font-size: 1.6rem;
                font-weight: 700;
            }
            
            .date-range p {
                font-size: 1.1rem;
                font-weight: 600;
            }
            
            .summary-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                gap: 25px;
                margin-bottom: 50px;
            }
            
            .summary-card {
                background: linear-gradient(135deg, #ffffff, #fdf2f8, #fce7f3);
                padding: 30px;
                border-radius: 16px;
                text-align: center;
                border: 3px solid #f9a8d4;
                box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1);
                transition: all 0.3s ease;
                position: relative;
                overflow: hidden;
            }
            
            .summary-card::before {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                height: 4px;
                background: linear-gradient(90deg, #ec4899, #be185d);
            }
            
            .summary-card:hover {
                transform: translateY(-5px);
                box-shadow: 0 20px 40px -10px rgba(236, 72, 153, 0.2);
            }
            
            .summary-card h3 {
                color: #6b7280;
                font-size: 1rem;
                margin-bottom: 12px;
                text-transform: uppercase;
                letter-spacing: 0.05em;
                font-weight: 600;
            }
            
            .summary-card .value {
                font-size: 2.2rem;
                font-weight: 900;
                color: #be185d;
                margin-bottom: 8px;
            }
            
            .section {
                margin-bottom: 50px;
                page-break-inside: avoid;
            }
            
            .section h2 {
                color: #be185d;
                margin-bottom: 25px;
                padding-bottom: 15px;
                border-bottom: 3px solid #f9a8d4;
                font-size: 1.8rem;
                font-weight: 700;
                display: flex;
                align-items: center;
                gap: 10px;
            }
            
            table {
                width: 100%;
                border-collapse: collapse;
                background: white;
                border-radius: 12px;
                overflow: hidden;
                box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1);
                margin-bottom: 25px;
                border: 2px solid #f9a8d4;
            }
            
            th {
                background: linear-gradient(135deg, #ec4899, #be185d);
                color: white;
                padding: 18px 15px;
                text-align: left;
                font-weight: 700;
                font-size: 0.95rem;
                text-transform: uppercase;
                letter-spacing: 0.05em;
            }
            
            td {
                padding: 15px;
                border-bottom: 1px solid #f3f4f6;
                font-size: 0.95rem;
                font-weight: 500;
            }
            
            tr:nth-child(even) {
                background: linear-gradient(135deg, #fdf2f8, #fce7f3);
            }
            
            tr:hover {
                background: linear-gradient(135deg, #fce7f3, #fbcfe8);
                transform: scale(1.01);
                transition: all 0.2s ease;
            }
            
            .profit-positive { 
                color: #059669; 
                font-weight: 700; 
            }
            
            .profit-negative { 
                color: #dc2626; 
                font-weight: 700; 
            }
            
            .text-center { text-align: center; }
            .text-right { text-align: right; }
            
            .insights-box {
                background: linear-gradient(135deg, #dbeafe, #bfdbfe, #93c5fd);
                border: 3px solid #3b82f6;
                border-radius: 16px;
                padding: 30px;
                margin: 30px 0;
                box-shadow: 0 10px 25px -5px rgba(59, 130, 246, 0.1);
            }
            
            .insights-box h3 {
                color: #1e40af;
                margin-bottom: 20px;
                font-size: 1.4rem;
                font-weight: 700;
            }
            
            .insights-list {
                list-style: none;
                padding: 0;
            }
            
            .insights-list li {
                padding: 12px 0;
                border-bottom: 2px solid #bfdbfe;
                color: #1e40af;
                font-weight: 600;
                font-size: 1.05rem;
            }
            
            .insights-list li:last-child {
                border-bottom: none;
            }
            
            .footer {
                text-align: center;
                margin-top: 60px;
                padding-top: 40px;
                border-top: 3px solid #f9a8d4;
                color: #6b7280;
                font-size: 1rem;
            }
            
            .footer .generated-date {
                color: #be185d;
                font-weight: 700;
                font-size: 1.2rem;
            }
            
            .page-break {
                page-break-before: always;
            }
            
            @media print {
                body { 
                    background: white; 
                    -webkit-print-color-adjust: exact;
                    print-color-adjust: exact;
                }
                .container { 
                    box-shadow: none; 
                    margin: 0;
                    border-radius: 0;
                    max-width: 100%;
                    border: none;
                }
                .summary-card:hover,
                tr:hover {
                    transform: none;
                }
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>Beauty Catalog</h1>
                <div class="subtitle">Reporte Completo de Ganancias</div>
            </div>

            <div class="date-range">
                <h2>📅 Período del Reporte</h2>
                <p><strong>${new Date(startDate).toLocaleDateString("es-ES", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}</strong> hasta <strong>${new Date(endDate).toLocaleDateString("es-ES", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}</strong></p>
                <p style="margin-top: 15px; color: #6b7280; font-weight: 600;">
                  📊 Duración: ${Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24))} días
                </p>
            </div>

            <div class="summary-grid">
                <div class="summary-card">
                    <h3>📦 Total Pedidos</h3>
                    <div class="value">${Number(summaryData.total_orders || 0).toLocaleString()}</div>
                </div>
                <div class="summary-card">
                    <h3>👥 Clientes Únicos</h3>
                    <div class="value">${Number(summaryData.unique_customers || 0).toLocaleString()}</div>
                </div>
                <div class="summary-card">
                    <h3>📋 Productos Vendidos</h3>
                    <div class="value">${Number(summaryData.total_items_sold || 0).toLocaleString()}</div>
                </div>
                <div class="summary-card">
                    <h3>💰 Ingresos Totales</h3>
                    <div class="value">C$${Number(summaryData.total_revenue || 0).toFixed(2)}</div>
                </div>
                <div class="summary-card">
                    <h3>📈 Ganancia Total</h3>
                    <div class="value profit-positive">C$${Number(summaryData.total_profit || 0).toFixed(2)}</div>
                </div>
                <div class="summary-card">
                    <h3>📊 Margen Promedio</h3>
                    <div class="value">${Number(summaryData.avg_profit_margin || 0).toFixed(1)}%</div>
                </div>
            </div>

            <div class="insights-box">
                <h3>💡 Insights Empresariales</h3>
                <ul class="insights-list">
                    <li><strong>💵 Valor Promedio por Pedido:</strong> C$${summaryData.total_orders > 0 ? (summaryData.total_revenue / summaryData.total_orders).toFixed(2) : "0.00"}</li>
                    <li><strong>📦 Productos por Pedido:</strong> ${summaryData.total_orders > 0 ? (summaryData.total_items_sold / summaryData.total_orders).toFixed(1) : "0.0"}</li>
                    <li><strong>👤 Ganancia por Cliente:</strong> C$${summaryData.unique_customers > 0 ? (summaryData.total_profit / summaryData.unique_customers).toFixed(2) : "0.00"}</li>
                    <li><strong>📈 Tasa de Rentabilidad:</strong> ${summaryData.total_revenue > 0 ? ((summaryData.total_profit / summaryData.total_revenue) * 100).toFixed(1) : "0.0"}%</li>
                </ul>
            </div>

            ${
              topProducts.length > 0
                ? `
            <div class="section">
                <h2>🏆 Productos Más Vendidos</h2>
                <table>
                    <thead>
                        <tr>
                            <th>Ranking</th>
                            <th>Producto</th>
                            <th>Marca</th>
                            <th>Cantidad</th>
                            <th>Pedidos</th>
                            <th>Ingresos</th>
                            <th>Ganancia</th>
                            <th>Margen</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${topProducts
                          .map(
                            (product, index) => `
                            <tr>
                                <td class="text-center"><strong>#${index + 1}</strong></td>
                                <td><strong>${product.product_name || "Sin nombre"}</strong></td>
                                <td>${product.brand || "Sin marca"}</td>
                                <td class="text-center">${Number(product.total_sold || 0).toLocaleString()}</td>
                                <td class="text-center">${Number(product.orders_count || 0).toLocaleString()}</td>
                                <td class="text-right">C$${Number(product.total_revenue || 0).toFixed(2)}</td>
                                <td class="text-right profit-positive">C$${Number(product.total_profit || 0).toFixed(2)}</td>
                                <td class="text-center">${Number(product.avg_profit_margin || 0).toFixed(1)}%</td>
                            </tr>
                        `,
                          )
                          .join("")}
                    </tbody>
                </table>
            </div>
            `
                : ""
            }

            ${
              categoryStats.length > 0
                ? `
            <div class="section">
                <h2>📂 Análisis por Categorías</h2>
                <table>
                    <thead>
                        <tr>
                            <th>Categoría</th>
                            <th>Productos</th>
                            <th>Cantidad Vendida</th>
                            <th>Ingresos</th>
                            <th>Ganancia</th>
                            <th>Margen Promedio</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${categoryStats
                          .map(
                            (category) => `
                            <tr>
                                <td><strong>${category.category_name || "Sin categoría"}</strong></td>
                                <td class="text-center">${Number(category.products_count || 0).toLocaleString()}</td>
                                <td class="text-center">${Number(category.total_sold || 0).toLocaleString()}</td>
                                <td class="text-right">C$${Number(category.total_revenue || 0).toFixed(2)}</td>
                                <td class="text-right profit-positive">C$${Number(category.total_profit || 0).toFixed(2)}</td>
                                <td class="text-center">${Number(category.avg_profit_margin || 0).toFixed(1)}%</td>
                            </tr>
                        `,
                          )
                          .join("")}
                    </tbody>
                </table>
            </div>
            `
                : ""
            }

            ${
              topCustomers.length > 0
                ? `
            <div class="section page-break">
                <h2>👥 Mejores Clientes</h2>
                <table>
                    <thead>
                        <tr>
                            <th>Cliente</th>
                            <th>Email</th>
                            <th>Pedidos</th>
                            <th>Total Gastado</th>
                            <th>Valor Promedio</th>
                            <th>Ganancia Generada</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${topCustomers
                          .map(
                            (customer) => `
                            <tr>
                                <td><strong>${customer.customer_name || "Sin nombre"}</strong></td>
                                <td>${customer.customer_email || "Sin email"}</td>
                                <td class="text-center">${Number(customer.total_orders || 0).toLocaleString()}</td>
                                <td class="text-right">C$${Number(customer.total_spent || 0).toFixed(2)}</td>
                                <td class="text-right">C$${Number(customer.avg_order_value || 0).toFixed(2)}</td>
                                <td class="text-right profit-positive">C$${Number(customer.total_profit_generated || 0).toFixed(2)}</td>
                            </tr>
                        `,
                          )
                          .join("")}
                    </tbody>
                </table>
            </div>
            `
                : ""
            }

            ${
              dailyStats.length > 0
                ? `
            <div class="section">
                <h2>📅 Rendimiento Diario</h2>
                <table>
                    <thead>
                        <tr>
                            <th>Fecha</th>
                            <th>Pedidos</th>
                            <th>Clientes</th>
                            <th>Productos</th>
                            <th>Ingresos</th>
                            <th>Ganancia</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${dailyStats
                          .map(
                            (day) => `
                            <tr>
                                <td><strong>${new Date(day.date).toLocaleDateString("es-ES")}</strong></td>
                                <td class="text-center">${Number(day.orders_count || 0).toLocaleString()}</td>
                                <td class="text-center">${Number(day.unique_customers || 0).toLocaleString()}</td>
                                <td class="text-center">${Number(day.items_sold || 0).toLocaleString()}</td>
                                <td class="text-right">C$${Number(day.revenue || 0).toFixed(2)}</td>
                                <td class="text-right profit-positive">C$${Number(day.profit || 0).toFixed(2)}</td>
                            </tr>
                        `,
                          )
                          .join("")}
                    </tbody>
                </table>
            </div>
            `
                : ""
            }

            <div class="insights-box">
                <h3>🎯 Recomendaciones Estratégicas</h3>
                <ul class="insights-list">
                    ${topProducts.length > 0 ? `<li><strong>🌟 Producto Estrella:</strong> ${topProducts[0].product_name} lidera las ventas</li>` : ""}
                    ${summaryData.avg_profit_margin > 30 ? "<li><strong>✅ Margen Saludable:</strong> Los márgenes están en rango excelente</li>" : "<li><strong>⚠️ Oportunidad:</strong> Considerar optimizar márgenes de ganancia</li>"}
                    ${summaryData.unique_customers > 0 ? `<li><strong>👥 Base de Clientes:</strong> ${summaryData.unique_customers} clientes únicos activos</li>` : ""}
                    <li><strong>🚀 Próximos Pasos:</strong> Analizar productos de bajo rendimiento y oportunidades de crecimiento</li>
                </ul>
            </div>

            <div class="footer">
                <p>📄 Reporte generado el <span class="generated-date">${new Date().toLocaleDateString("es-ES", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}</span></p>
                <p><strong>Beauty Catalog</strong> - Sistema de Gestión Administrativa Profesional</p>
                <p style="margin-top: 15px; font-size: 0.9rem; color: #9ca3af;">
                    🔒 Este reporte contiene información confidencial para uso interno exclusivamente
                </p>
            </div>
        </div>

        <script>
            console.log('[v0] PDF report loaded successfully');
            window.onload = function() {
                console.log('[v0] Initiating print dialog...');
                setTimeout(() => {
                    try {
                        window.print();
                        console.log('[v0] Print dialog opened');
                    } catch (error) {
                        console.error('[v0] Print failed:', error);
                    }
                }, 1500);
            }
        </script>
    </body>
    </html>
    `

    console.log("[v0] HTML report generated successfully")

    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Disposition": `inline; filename="reporte-ganancias-${startDate}-${endDate}.html"`,
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    })
  } catch (error) {
    console.error("[v0] Critical error in PDF generation:", error)

    const errorHtml = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <title>Error en Reporte</title>
        <style>
            body { font-family: Arial, sans-serif; padding: 40px; text-align: center; }
            .error { color: #dc2626; background: #fef2f2; padding: 20px; border-radius: 8px; }
        </style>
    </head>
    <body>
        <div class="error">
            <h1>Error al Generar Reporte</h1>
            <p>No se pudo generar el reporte PDF. Por favor, intenta nuevamente.</p>
            <p><strong>Detalles:</strong> ${error instanceof Error ? error.message : "Error desconocido"}</p>
        </div>
    </body>
    </html>
    `

    return new NextResponse(errorHtml, {
      status: 500,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
      },
    })
  }
}
