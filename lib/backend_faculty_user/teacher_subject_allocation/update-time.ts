"use server"

import { z } from "zod"
import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/backend_super_admin/auth/auth"

const schema = z.object({
  id: z.coerce.number().int().positive(),
  start_time: z.string().regex(/^\d{2}:\d{2}$/, "Start time must be HH:MM"),
  end_time: z.string().regex(/^\d{2}:\d{2}$/, "End time must be HH:MM"),
})

/**
 * Server action: update ONLY the start_time and end_time of an allocation.
 * Used by the Edit button on each row.
 *
 * - Requires a signed-in faculty user.
 * - The allocation's class must belong to the signed-in user's faculty.
 * - end_time must be strictly after start_time.
 */
export async function updateAllocationTime(formData: FormData) {
  const session = await auth()
  const role = (session?.user as any)?.role as string | undefined
  const facultyId = (session?.user as any)?.faculty_id as number | undefined
  if (!session) return { error: "Not authenticated" }
  if (role !== "faculty") {
    return { error: "Only faculty users can edit allocation time" }
  }
  if (!facultyId) return { error: "Faculty scope missing" }

  const parsed = schema.safeParse({
    id: formData.get("id"),
    start_time: formData.get("start_time"),
    end_time: formData.get("end_time"),
  })
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" }
  }

  const [sh, sm] = parsed.data.start_time.split(":")
  const [eh, em] = parsed.data.end_time.split(":")
  const startMin = Number(sh) * 60 + Number(sm)
  const endMin = Number(eh) * 60 + Number(em)
  if (endMin <= startMin) {
    return { error: "End time must be after start time" }
  }

  const row = await prisma.teacher_subject_allocation.findUnique({
    where: { id: parsed.data.id },
    include: { subject_class: { include: { classes: { include: { departments: true } } } } },
  })
  if (!row) return { error: "Allocation not found" }
  if (row.subject_class.classes.departments.faculty_id !== facultyId) {
    return { error: "This allocation does not belong to your faculty" }
  }

  // Same Date.UTC round-trip as create.ts so the value stored in the
  // MySQL Time column equals the wall-clock time the user typed.
  const startUtc = new Date(Date.UTC(1970, 0, 1, Number(sh), Number(sm), 0))
  const endUtc = new Date(Date.UTC(1970, 0, 1, Number(eh), Number(em), 0))

  try {
    await prisma.teacher_subject_allocation.update({
      where: { id: parsed.data.id },
      data: { start_time: startUtc, end_time: endUtc },
    })
  } catch {
    return { error: "Could not update time" }
  }

  revalidatePath("/faculty_user/teacher-allocation")
  return { ok: true as const }
}
