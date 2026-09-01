// Pure helpers for teacher_subject_allocation status.
// No "use server" directive here so this file can export non-async values.

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

  // Compare the time-of-day portion of `now` with the allocation's window.
  const nowMs =
    now.getHours() * 3600_000 + now.getMinutes() * 60_000 + now.getSeconds() * 1000
  const startMs = timeToMs(startTime)
  const endMs = timeToMs(endTime)

  const inside = nowMs >= startMs && nowMs <= endMs

  if (inside) return "approved"
  return "pending"
}

function timeToMs(t: Date): number {
  // Prisma returns Time fields as Date with epoch date (1970-01-01) and the time-of-day set.
  return t.getHours() * 3600_000 + t.getMinutes() * 60_000 + t.getSeconds() * 1000
}

/**
 * Visual color tokens for each live status.
 *  - pending  -> yellow (waiting on faculty action or time)
 *  - waiting  -> red    (faculty allowed, but time window not open)
 *  - approved -> green  (faculty allowed AND inside time window)
 */
export const statusColors: Record<LiveStatus, { bg: string; text: string; label: string }> = {
  pending:  { bg: "bg-yellow-100",  text: "text-yellow-800",  label: "pending" },
  waiting:  { bg: "bg-red-100",     text: "text-red-800",     label: "waiting" },
  approved: { bg: "bg-green-100",   text: "text-green-800",   label: "approved" },
}
