"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"

export async function deleteSuperAdmin(id: number) {
  await prisma.super_admin.delete({ where: { id } })
  revalidatePath("/super_admin/super_admin")
  return { ok: true as const }
}
