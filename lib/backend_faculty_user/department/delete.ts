"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"

export async function deleteDepartment(id: number) {
  try {
    await prisma.departments.delete({ where: { id } })
  } catch {
    return { error: "Cannot delete department (it has related classes or subjects)" }
  }
  revalidatePath("/faculty_user/department")
  return { ok: true as const }
}
