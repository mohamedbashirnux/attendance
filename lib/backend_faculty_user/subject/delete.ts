"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/backend_super_admin/auth/auth"

export async function deleteSubject(id: number) {
  const session = await auth()
  const facultyId = (session?.user as any)?.faculty_id as number | undefined
  if (!facultyId) return { error: "Not authenticated" }

  try {
    await prisma.subjects.delete({ where: { id } })
  } catch {
    return { error: "Cannot delete subject (it has related classes or allocations)" }
  }
  revalidatePath("/faculty_user/subject")
  return { ok: true as const }
}
