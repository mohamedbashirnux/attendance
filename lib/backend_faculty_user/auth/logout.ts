"use server"

import { signOut } from "@/lib/backend_super_admin/auth/auth"

export async function logoutFacultyAction() {
  await signOut({ redirectTo: "/" })
}
