"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"

export async function deleteTeacher(id: number) {
  try {
    await prisma.teachers.delete({ where: { id } })
  } catch {
    return { error: "Cannot delete teacher (has related allocations)" }
  }
  revalidatePath("/faculty_user/teacher")
  return { ok: true as const }
}
