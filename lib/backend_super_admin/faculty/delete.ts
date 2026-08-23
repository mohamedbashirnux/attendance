"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"

export async function deleteFaculty(id: number) {
  await prisma.faculty.delete({ where: { id } })
  revalidatePath("/super_admin")
  return { ok: true as const }
}
