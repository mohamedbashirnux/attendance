"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/backend_super_admin/auth/auth"

export async function deleteClass(id: number) {
  const session = await auth()
  const facultyId = (session?.user as any)?.faculty_id as number | undefined
  if (!facultyId) return { error: "Not authenticated" }

  try {
    await prisma.classes.delete({ where: { id } })
  } catch {
    return { error: "Cannot delete class (it has related students or records)" }
  }
  revalidatePath("/faculty_user/class")
  return { ok: true as const }
}
