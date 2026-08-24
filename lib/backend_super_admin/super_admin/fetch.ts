"use server"

import { prisma } from "@/lib/prisma"

export type SuperAdminRow = {
  id: number
  full_name: string
  username: string
  created_at: Date
}

export async function getSuperAdmins(): Promise<SuperAdminRow[]> {
  const rows = await prisma.super_admin.findMany({ orderBy: { id: "asc" } })
  return rows.map((r) => ({
    id: r.id,
    full_name: r.full_name,
    username: r.username,
    created_at: r.created_at,
  }))
}
