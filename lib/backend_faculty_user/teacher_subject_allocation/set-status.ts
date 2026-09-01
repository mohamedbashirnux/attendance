// Display helpers for teacher allocation status.
// Pure utilities only — no server-only imports.

export type AllocationStatus = "pending" | "waiting" | "approved"

/**
 * Visual color tokens for each status.
 *  - pending  -> yellow (default, no action yet)
 *  - waiting  -> red    (faculty marked, not yet started)
 *  - approved -> green  (faculty approved)
 */
export const statusColors: Record<AllocationStatus, { bg: string; text: string; border: string; label: string }> = {
  pending:  { bg: "bg-yellow-50",  text: "text-yellow-800",  border: "border-yellow-300", label: "pending" },
  waiting:  { bg: "bg-red-50",     text: "text-red-800",     border: "border-red-300",    label: "waiting" },
  approved: { bg: "bg-green-50",   text: "text-green-800",   border: "border-green-300",  label: "approved" },
}
