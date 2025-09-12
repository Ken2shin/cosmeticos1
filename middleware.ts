import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function middleware(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith("/admin")) {
    const token = request.cookies.get("admin-token")

    // Only redirect to login if no token and not already on login page
    if (!token?.value || token.value !== "authenticated") {
      if (request.nextUrl.pathname !== "/admin/login") {
        return NextResponse.redirect(new URL("/admin/login", request.url))
      }
    }

    if (token?.value === "authenticated" && request.nextUrl.pathname === "/admin/login") {
      return NextResponse.redirect(new URL("/admin", request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
}
