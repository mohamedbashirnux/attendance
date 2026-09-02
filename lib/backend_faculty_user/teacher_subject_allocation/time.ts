// Time-of-day helpers. The DB stores `start_time` / `end_time` as MySQL
// `Time(0)` (no date, no timezone). We treat them as plain "HH:MM:SS"
// strings everywhere and never as Date objects, so there is no timezone
// conversion to worry about.

/**
 * Convert a Date that Prisma returns from a `Time(0)` column into a
 * "HH:MM:SS" string. We use the UTC components because we always WRITE
 * the value with `Date.UTC(...)` in `create.ts`; this keeps the round-trip
 * stable across server timezones.
 */
export function toTimeString(d: Date): string {
  const h = String(d.getUTCHours()).padStart(2, "0")
  const m = String(d.getUTCMinutes()).padStart(2, "0")
  const s = String(d.getUTCSeconds()).padStart(2, "0")
  return `${h}:${m}:${s}`
}

/**
 * Parse a "HH:MM:SS" (or "HH:MM") string into milliseconds since
 * midnight. Pure math, no Date, no timezone.
 */
export function timeToMs(t: string): number {
  const [h, m, s] = t.split(":").map(Number)
  return h * 3600_000 + (m ?? 0) * 60_000 + (s ?? 0) * 1000
}

/**
 * Local wall-clock "now" as ms since midnight.
 */
export function nowToMs(now: Date = new Date()): number {
  return (
    now.getHours() * 3600_000 +
    now.getMinutes() * 60_000 +
    now.getSeconds() * 1000
  )
}
