// Display + live-status helpers for teacher allocation status.
// Pure utilities only — no server-only imports.

export type AllocationStatus = "pending" | "waiting" | "approved"

/**
 * Compute the live (effective) status of an allocation based on the current time.
 *
 * Rules (matches the user's spec):
 *  - If the stored status is "pending", live status is always "pending".
 *  - If the stored status is "waiting":
 *      - inside the time window  -> live status becomes "approved"
 *      - outside the time window -> live status stays "waiting" (the dean
 *        pre-approved, but the time hasn't started yet OR already passed for
 *        the current day; either way, the next time the window opens the
 *        live status will auto-promote to approved).
 *  - If the stored status is "approved":
 *      - inside the time window  -> live status is "approved"
 *      - outside the time window -> live status reverts to "pending" (the
 *        class session is over; dean must re-allow for the next session).
 *
 * Day of week and timetable are NOT considered.
 */
export function computeLiveStatus(
  storedStatus: string | null,
  startTime: Date,
  endTime: Date,
  now: Date = new Date()
): AllocationStatus {
  const stored = (storedStatus ?? "pending") as AllocationStatus
  if (stored === "pending") return "pending"
  if (stored === "waiting") {
    // 'waiting' is "dean pre-approved" — it should stay 'waiting' until the
    // time window opens, at which point it auto-promotes to 'approved'.
    const nowMs =
      now.getHours() * 3600_000 + now.getMinutes() * 60_000 + now.getSeconds() * 1000
    const startMs = timeToMs(startTime)
    const endMs = timeToMs(endTime)
    const inside = nowMs >= startMs && nowMs <= endMs
    if (inside) return "approved"
    return "waiting"
  }

  // stored === "approved"
  // If the time window is open, keep showing 'approved'.
  // If the time window has CLOSED (now > end), revert to 'pending' so the
  // dean knows the class session is over.
  const nowMs =
    now.getHours() * 3600_000 + now.getMinutes() * 60_000 + now.getSeconds() * 1000
  const endMs = timeToMs(endTime)
  if (nowMs <= endMs) return "approved"
  return "pending"
}

function timeToMs(t: Date): number {
  return t.getHours() * 3600_000 + t.getMinutes() * 60_000 + t.getSeconds() * 1000
}

/**
 * Visual color tokens for each live status.
 *  - pending  -> yellow (default, or time ended)
 *  - waiting  -> red    (faculty allowed, but time window not open)
 *  - approved -> green  (faculty allowed AND inside time window)
 */
export const statusColors: Record<AllocationStatus, { bg: string; text: string; border: string; label: string }> = {
  pending:  { bg: "bg-yellow-50",  text: "text-yellow-800",  border: "border-yellow-300", label: "pending" },
  waiting:  { bg: "bg-red-50",     text: "text-red-800",     border: "border-red-300",    label: "waiting" },
  approved: { bg: "bg-green-50",   text: "text-green-800",   border: "border-green-300",  label: "approved" },
}
