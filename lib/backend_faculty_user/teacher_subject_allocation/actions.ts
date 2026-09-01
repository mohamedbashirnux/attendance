"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/backend_super_admin/auth/auth"

const VALID_STATUSES = ["pending", "waiting", "approved"] as const
type AllocationStatus = (typeof VALID_STATUSES)[number]

/**
 * Server action: update the status of a teacher allocation.
 *
 * - Requires a signed-in faculty user.
 * - The allocation's class must belong to the signed-in user's faculty.
 * - `newStatus` must be one of "pending" | "waiting" | "approved".
 * - The action is role-safe: only faculty users can change status, never
 *   teachers or super admins. (Caller is responsible for not exposing this
 *   in teacher-facing pages.)
 */
export async function setStatus(id: number, newStatus: string) {
  const session = await auth()
  const facultyId = (session?.user as any)?.faculty_id as number | undefined
  const role = (session?.user as any)?.role as string | undefined
  if (!session) return { error: "Not authenticated" }
  if (role !== "faculty") {
    return { error: "Only faculty users can change allocation status" }
  }
  if (!facultyId) return { error: "Faculty scope missing" }
  if (!VALID_STATUSES.includes(newStatus as AllocationStatus)) {
    return { error: "Invalid status value" }
  }

  const row = await prisma.teacher_subject_allocation.findUnique({
    where: { id },
    include: { subject_class: { include: { classes: { include: { departments: true } } } } },
  })
  if (!row) return { error: "Allocation not found" }
  if (row.subject_class.classes.departments.faculty_id !== facultyId) {
    return { error: "This allocation does not belong to your faculty" }
  }

  try {
    await prisma.teacher_subject_allocation.update({
      where: { id },
      data: { status: newStatus },
    })
  } catch {
    return { error: "Could not update status" }
  }

  revalidatePath("/faculty_user/teacher-allocation")
  return { ok: true as const }
}
