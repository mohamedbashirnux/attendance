"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/backend_super_admin/auth/auth"

export async function deleteStudent(id: number) {
  const session = await auth()
  const facultyId = (session?.user as any)?.faculty_id as number | undefined
  if (!facultyId) return { error: "Not authenticated" }

  try {
    await prisma.students.delete({ where: { id } })
  } catch {
    return { error: "Cannot delete student (they have related attendance records)" }
  }
  revalidatePath("/faculty_user/student")
  return { ok: true as const }
}
