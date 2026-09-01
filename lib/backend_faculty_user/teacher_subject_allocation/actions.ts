"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/backend_super_admin/auth/auth"

/**
 * Server action: move a teacher allocation from "pending" to "waiting".
 *
 * - Requires a signed-in faculty user.
 * - The allocation's class must belong to the signed-in user's faculty.
 * - Refuses if the current stored status is anything other than "pending"
 *   (waiting and approved are managed by time, not by clicks).
 *
 * The time-based promotion (waiting -> approved) and revert (approved -> pending
 * after end_time) is handled in computeLiveStatus at display time, NOT in the
 * DB. So we only persist the dean's "allow" click here.
 */
export async function setWaiting(id: number) {
  const session = await auth()
  const role = (session?.user as any)?.role as string | undefined
  const facultyId = (session?.user as any)?.faculty_id as number | undefined
  if (!session) return { error: "Not authenticated" }
  if (role !== "faculty") {
    return { error: "Only faculty users can allow an allocation" }
  }
  if (!facultyId) return { error: "Faculty scope missing" }

  const row = await prisma.teacher_subject_allocation.findUnique({
    where: { id },
    include: { subject_class: { include: { classes: { include: { departments: true } } } } },
  })
  if (!row) return { error: "Allocation not found" }
  if (row.subject_class.classes.departments.faculty_id !== facultyId) {
    return { error: "This allocation does not belong to your faculty" }
  }
  if (row.status !== "pending") {
    return { error: `Cannot allow: current status is "${row.status}". Only pending allocations can be allowed.` }
  }

  try {
    await prisma.teacher_subject_allocation.update({
      where: { id },
      data: { status: "waiting" },
    })
  } catch {
    return { error: "Could not update status" }
  }

  revalidatePath("/faculty_user/teacher-allocation")
  return { ok: true as const }
}
