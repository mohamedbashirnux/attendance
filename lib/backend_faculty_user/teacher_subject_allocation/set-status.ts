// Combined: pure helpers + server action for teacher allocation status.
// Uses inline 'use server' on the action only, so the file can also export
// pure (non-async) helpers and constants that the client can import.

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/backend_super_admin/auth/auth"

export type LiveStatus = "pending" | "waiting" | "approved"

/**
 * Compute the live (effective) status of an allocation based on the current time.
 *
 * Rules (matches the user's spec):
 *  - If the stored status is "pending", live status is always "pending".
 *  - If the stored status is "waiting":
 *      - inside the time window  -> live status becomes "approved"
 *      - outside the time window -> live status is "pending" (time hasn't started or has ended)
 *  - If the stored status is "approved":
 *      - inside the time window  -> live status is "approved"
 *      - outside the time window -> live status reverts to "pending" (time ended)
 *
 * Day of week and timetable are NOT considered.
 */
export function computeLiveStatus(
  storedStatus: string | null,
  startTime: Date,
  endTime: Date,
  now: Date = new Date()
): LiveStatus {
  const stored = (storedStatus ?? "pending") as LiveStatus
  if (stored === "pending") return "pending"

  const nowMs =
    now.getHours() * 3600_000 + now.getMinutes() * 60_000 + now.getSeconds() * 1000
  const startMs = timeToMs(startTime)
  const endMs = timeToMs(endTime)

  const inside = nowMs >= startMs && nowMs <= endMs

  if (inside) return "approved"
  return "pending"
}

function timeToMs(t: Date): number {
  return t.getHours() * 3600_000 + t.getMinutes() * 60_000 + t.getSeconds() * 1000
}

/**
 * Visual color tokens for each live status.
 *  - pending  -> yellow (waiting on faculty action or time)
 *  - waiting  -> red    (faculty allowed, but time window not open)
 *  - approved -> green  (faculty allowed AND inside time window)
 */
export const statusColors: Record<LiveStatus, { bg: string; text: string; border: string; label: string }> = {
  pending:  { bg: "bg-yellow-50",  text: "text-yellow-800",  border: "border-yellow-300", label: "pending" },
  waiting:  { bg: "bg-red-50",     text: "text-red-800",     border: "border-red-300",    label: "waiting" },
  approved: { bg: "bg-green-50",   text: "text-green-800",   border: "border-green-300",  label: "approved" },
}

/**
 * Server action: move a teacher allocation from "pending" to "waiting".
 *
 * - Requires a signed-in faculty user.
 * - The allocation's class must belong to the signed-in user's faculty.
 * - Refuses if the current stored status is anything other than "pending".
 */
export async function setWaiting(id: number) {
  "use server"
  const session = await auth()
  const facultyId = (session?.user as any)?.faculty_id as number | undefined
  if (!facultyId) return { error: "Not authenticated" }

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
