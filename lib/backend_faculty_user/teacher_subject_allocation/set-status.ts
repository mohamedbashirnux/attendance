// Display + live-status helpers for teacher allocation status.
// Pure utilities only — no server-only imports.

import { nowToMs, timeToMs } from "./time"

export type AllocationStatus = "pending" | "waiting" | "approved"

/**
 * Compute the live (effective) status of an allocation based on the current time.
 *
 * startTime / endTime are "HH:MM:SS" strings (no date, no timezone).
 * `now` is the user's wall clock — we read it with the LOCAL accessors
 * because that is what the user sees.
 *
 * Rules:
 *  - "pending"  is always "pending" (yellow). The dean must explicitly
 *                 allow it (click -> "waiting") before a teacher can take
 *                 attendance, even if the time window is currently open.
 *  - "waiting"  + inside the time window  -> "approved" (dean allowed
 *                 AND time is right — teacher can take attendance now).
 *  - "waiting"  + outside the window      -> "waiting" (dean allowed,
 *                 waiting for the window to open).
 *  - "approved" + inside the window      -> "approved".
 *  - "approved" + outside the window     -> "pending" (window hasn't
 *                 started yet OR has already ended — the dean must
 *                 re-allow for the next session).
 *
 * After a successful attendance submission the API resets the stored
 * status to "pending", so even if the time is still inside the window
 * the teacher cannot submit a second attendance for the same session.
 *
 * Day of week and timetable are NOT considered.
 */
export function computeLiveStatus(
  storedStatus: string | null,
  startTime: string,
  endTime: string,
  now: Date = new Date()
): AllocationStatus {
  const stored = (storedStatus ?? "pending") as AllocationStatus
  if (stored === "pending") return "pending"

  const nowMs = nowToMs(now)
  const startMs = timeToMs(startTime)
  const endMs = timeToMs(endTime)
  const inside = nowMs >= startMs && nowMs <= endMs

  if (stored === "waiting") {
    return inside ? "approved" : "waiting"
  }
  // stored === "approved" — only stays "approved" while we are INSIDE
  // the window. If the window hasn't started yet, or has already ended,
  // the live status falls back to "pending" so the dean has to re-allow
  // before the teacher can take attendance.
  return inside ? "approved" : "pending"
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
