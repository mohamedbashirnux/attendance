"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"

export async function deleteFacultyUser(id: number) {
  await prisma.faculty_users.delete({ where: { id } })
  revalidatePath("/super_admin/faculty_users")
  return { ok: true as const }
}
