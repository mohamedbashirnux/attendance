"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"

export async function deleteAllocation(id: number) {
  try {
    await prisma.teacher_subject_allocation.delete({ where: { id } })
  } catch {
    return { error: "Could not delete allocation" }
  }
  revalidatePath("/faculty_user/teacher-allocation")
  return { ok: true as const }
}
