export { auth as proxy } from "@/lib/backend_super_admin/auth/auth"

export const config = {
  matcher: ["/super_admin/:path*", "/faculty_user/:path*"],
}
