import { AdminLogin } from "@/components/auth/admin-login"
import { TokenCleanup } from "@/components/auth/token-cleanup"

export default function AdminLoginPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 to-pink-100 flex flex-col items-center justify-center p-4">
      <AdminLogin />
      <TokenCleanup />
    </div>
  )
}
