"use server"

import { revalidatePath } from "next/cache"
import { teacher_subject_allocation_status } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/backend_super_admin/auth/auth"

const VALID_STATUSES = ["pending", "waiting", "approved"] as const
type AllocationStatus = (typeof VALID_STATUSES)[number]

/**
 * Server action: set the status of a teacher allocation.
 * Used by the cycle button on each row:
 *   pending  -> waiting
 *   waiting  -> approved
 *   approved -> pending
 *
 * - Requires a signed-in faculty user.
 * - The allocation's class must belong to the signed-in user's faculty.
 */
export async function changeStatus(id: number, newStatus: string) {
  const session = await auth()
  const role = (session?.user as any)?.role as string | undefined
  const facultyId = (session?.user as any)?.faculty_id as number | undefined
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
      data: { status: newStatus as teacher_subject_allocation_status },
    })
  } catch {
    return { error: "Could not update status" }
  }

  revalidatePath("/faculty_user/teacher-allocation")
  return { ok: true as const }
}
