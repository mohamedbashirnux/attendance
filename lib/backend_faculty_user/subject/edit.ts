"use server"

import { z } from "zod"
import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/backend_super_admin/auth/auth"

const schema = z.object({
  department_id: z.coerce.number().int().positive("Select a department"),
  subject_name: z.string().trim().min(1, "Subject name is required").max(100),
})

export async function updateSubject(id: number, formData: FormData) {
  const session = await auth()
  const facultyId = (session?.user as any)?.faculty_id as number | undefined
  if (!facultyId) return { error: "Not authenticated" }

  const parsed = schema.safeParse({
    department_id: formData.get("department_id"),
    subject_name: formData.get("subject_name"),
  })
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" }
  }

  try {
    await prisma.subjects.update({
      where: { id },
      data: { ...parsed.data },
    })
  } catch {
    return { error: "Could not update subject" }
  }

  revalidatePath("/faculty_user/subject")
  return { ok: true as const }
}
