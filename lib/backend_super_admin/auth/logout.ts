"use server"

import { signOut } from "@/lib/backend_super_admin/auth/auth"

export async function logoutAction() {
  await signOut({ redirectTo: "/login" })
}
