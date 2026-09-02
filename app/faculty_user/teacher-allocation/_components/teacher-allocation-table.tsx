"use client"

import * as React from "react"
import { useTable, flexRender } from "@tanstack/react-table"
import {
  tableFeatures,
  createCoreRowModel,
  createColumnHelper,
  coreFeatures,
  type TableFeatures,
  type ColumnDef,
} from "@tanstack/table-core"
import type { AllocationRow } from "@/lib/backend_faculty_user/teacher_subject_allocation/fetch"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  computeLiveStatus,
  statusColors,
  type AllocationStatus,
} from "@/lib/backend_faculty_user/teacher_subject_allocation/set-status"
import { nowToMs, timeToMs } from "@/lib/backend_faculty_user/teacher_subject_allocation/time"
import { changeStatus } from "@/lib/backend_faculty_user/teacher_subject_allocation/actions"
import { updateAllocationTime } from "@/lib/backend_faculty_user/teacher_subject_allocation/update-time"

const helper = createColumnHelper<TableFeatures, AllocationRow>()

// Display the time as "HH:MM" (we already store "HH:MM:SS" strings).
function fmtTime(v: string): string {
  return v.slice(0, 5)
}

function liveOf(row: AllocationRow, now: Date): AllocationStatus {
  return computeLiveStatus(row.status, row.start_time, row.end_time, now)
}

// Human-readable countdown like "2h 47m" or "47m" or "12 min".
// Returns null if `ms` is non-positive (i.e. the moment has arrived).
function fmtCountdown(ms: number): string | null {
  if (ms <= 0) return null
  const totalMin = Math.floor(ms / 60_000)
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  if (h > 0) return `${h}h ${m}m`
  return `${m} min`
}

// Build the small hint text shown under the badge for the current live state.
//
// Time text depends on where "now" falls relative to the class window:
//   - before today's start     -> "in 3h 13m"           (same day)
//   - inside today's window    -> "ends in 1h 45m"      (countdown to end)
//   - after today's end        -> "in 19h 31m (tomorrow)" (next day)
//
// The status-specific prefix tells the dean what is happening:
//   - pending + before start   -> "Class starts in 3h 13m"
//   - pending + inside window  -> "In progress — ends in 1h 45m"
//   - pending + after end      -> "Class starts in 19h 31m (tomorrow)"
//   - waiting + before start   -> "Auto-approve in 53 min"
//   - waiting + inside window  -> "Auto-approve now" (or "in progress")
//   - waiting + after end      -> "Auto-approve in 19h 31m (tomorrow)"
//   - approved + inside window -> "Class ends in 1h 57m"
//   - approved + after end     -> "Next class in 19h 31m (tomorrow)"
function hintFor(row: AllocationRow, now: Date): string | null {
  const live = liveOf(row, now)
  const startMs = timeToMs(row.start_time)
  const endMs = timeToMs(row.end_time)
  const nowMs = nowToMs(now)
  const dayMs = 24 * 3600_000

  // Where are we in the day vs. the class window?
  let diff: number
  let tomorrow = false
  if (nowMs < startMs) {
    diff = startMs - nowMs
  } else if (nowMs <= endMs) {
    diff = endMs - nowMs
  } else {
    diff = dayMs - nowMs + startMs
    tomorrow = true
  }

  const countdown = fmtCountdown(diff)
  const inText = countdown ? `in ${countdown}` : "now"
  const when = tomorrow ? `${inText} (tomorrow)` : inText

  // Inside the window: class is currently happening, so always show
  // "in progress" and a countdown to end — regardless of stored status.
  if (nowMs >= startMs && nowMs <= endMs) {
    if (live === "approved") return `Class ends ${when}`
    if (live === "waiting") return `In progress — auto-approved, ends ${when}`
    // live === "pending"
    return `In progress — ends ${when}`
  }

  // Outside the window: depends on stored status.
  if (live === "pending") return `Class starts ${when}`
  if (live === "waiting") return `Auto-approve ${when}`
  // live === "approved" but past end (only reachable from approved when
  // the time just slipped past the window).
  return `Next class ${when}`
}

function StatusBadge({ status, onClick, busy }: { status: AllocationStatus; onClick?: () => void; busy?: boolean }) {
  const c = statusColors[status]
  const interactive = !!onClick
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!interactive || busy}
      title={interactive ? "Click to change status" : undefined}
      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${c.bg} ${c.text} ${c.border} ${
        interactive ? "cursor-pointer hover:opacity-80" : "cursor-default"
      }`}
    >
      {c.label}
    </button>
  )
}

// Click logic: time-aware. The dean's click combined with the current time
// determines the next stored status.
//
// - click on 'pending':
//     * inside [start, end]  -> 'approved'  (dean + time both ok)
//     * outside [start, end] -> 'waiting'   (dean approved, waiting for time)
// - click on 'waiting'  -> 'approved' (force approval)
// - click on 'approved' -> 'pending'  (reset)
function nextOnClick(
  current: AllocationStatus,
  startTime: string,
  endTime: string,
  now: Date
): AllocationStatus {
  if (current === "waiting") return "approved"
  if (current === "approved") return "pending"

  // current === "pending"
  const nowMs = nowToMs(now)
  const startMs = timeToMs(startTime)
  const endMs = timeToMs(endTime)

  if (nowMs >= startMs && nowMs <= endMs) return "approved"
  return "waiting"
}

export function TeacherAllocationTable({
  data,
  onDelete,
  onChanged,
  serverNow,
}: {
  data: AllocationRow[]
  onDelete: (r: AllocationRow) => void
  onChanged: () => void
  serverNow: string
}) {
  const [busyId, setBusyId] = React.useState<number | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const [editing, setEditing] = React.useState<AllocationRow | null>(null)
  // 'now' is seeded from the server-rendered ISO string so the first client
  // render uses the same 'now' as the server. After mount we use the
  // client's clock and refresh every 30s.
  const [now, setNow] = React.useState<Date>(() => new Date(serverNow))
  const [mounted, setMounted] = React.useState(false)
  React.useEffect(() => {
    setMounted(true)
    setNow(new Date())
    const t = setInterval(() => setNow(new Date()), 30_000)
    return () => clearInterval(t)
  }, [])

  async function handleBadgeClick(row: AllocationRow) {
    setError(null)
    const current = (row.status ?? "pending") as AllocationStatus
    const next = nextOnClick(current, row.start_time, row.end_time, now)
    setBusyId(row.id)
    const res = await changeStatus(row.id, next)
    setBusyId(null)
    if (res && "error" in res) {
      setError(res.error ?? "Could not change status")
      return
    }
    onChanged()
  }

  const columns = React.useMemo(
    (): ColumnDef<TableFeatures, AllocationRow, any>[] => [
      helper.display({
        id: "no",
        header: "No.",
        cell: (info) => info.row.index + 1,
      }),
      helper.accessor("teacher_code", {
        header: "Teacher",
        cell: (info) => `${info.getValue()} — ${info.row.original.teacher_name}`,
      }),
      helper.accessor("subject_name", { header: "Subject" }),
      helper.accessor("start_time", { header: "Start", cell: (info) => fmtTime(info.getValue()) }),
      helper.accessor("end_time", { header: "End", cell: (info) => fmtTime(info.getValue()) }),
      helper.display({
        id: "status",
        header: "Status",
        cell: (info) => {
          const row = info.row.original
          const live = liveOf(row, now)
          const hint = hintFor(row, now)
          return (
            <div className="flex flex-col items-start gap-0.5">
              <StatusBadge
                status={live}
                onClick={mounted ? () => handleBadgeClick(row) : undefined}
                busy={busyId === row.id}
              />
              {hint ? (
                <span className="text-[10px] text-muted-foreground">{hint}</span>
              ) : null}
            </div>
          )
        },
      }),
      helper.display({
        id: "actions",
        header: "Actions",
        cell: (info) => {
          const row = info.row.original
          return (
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                className="rounded-md"
                onClick={() => setEditing(row)}
              >
                Edit
              </Button>
              <Button
                size="sm"
                variant="destructive"
                className="rounded-md"
                onClick={() => onDelete(row)}
              >
                Delete
              </Button>
            </div>
          )
        },
      }),
    ],
    [busyId, now],
  )

  // Note: the columns reference `setEditing` (stable) and `onDelete`/`onChanged`
  // (stable from parent), so the `editing` state itself doesn't need to be a
  // dependency — opening/closing the dialog doesn't affect column rendering.

  const table = useTable({
    features: tableFeatures({ ...coreFeatures, coreRowModel: createCoreRowModel() }),
    columns,
    data,
  })

  return (
    <>
      <div className="space-y-2">
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <div className="overflow-hidden rounded-md border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id} className="border-b">
                  {headerGroup.headers.map((header) => (
                    <th key={header.id} className="px-4 py-2 text-left font-medium">
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="px-4 py-8 text-center text-muted-foreground">
                    No allocations yet.
                  </td>
                </tr>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <tr key={row.id} className="border-b last:border-0">
                    {row.getAllCells().map((cell) => (
                      <td key={cell.id} className="px-4 py-2">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <EditTimeDialog
        row={editing}
        onClose={() => setEditing(null)}
        onSaved={() => {
          setEditing(null)
          onChanged()
        }}
      />
    </>
  )
}

// Dialog for editing ONLY start_time and end_time of one allocation.
function EditTimeDialog({
  row,
  onClose,
  onSaved,
}: {
  row: AllocationRow | null
  onClose: () => void
  onSaved: () => void
}) {
  const [start, setStart] = React.useState("")
  const [end, setEnd] = React.useState("")
  const [busy, setBusy] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  // Seed the inputs whenever a new row is opened.
  React.useEffect(() => {
    if (row) {
      setStart(row.start_time.slice(0, 5))
      setEnd(row.end_time.slice(0, 5))
      setError(null)
    }
  }, [row])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!row) return
    setBusy(true)
    setError(null)
    const fd = new FormData()
    fd.set("id", String(row.id))
    fd.set("start_time", start)
    fd.set("end_time", end)
    const res = await updateAllocationTime(fd)
    setBusy(false)
    if (res && "error" in res) {
      setError(res.error ?? "Could not save")
      return
    }
    onSaved()
  }

  return (
    <Dialog open={!!row} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Time</DialogTitle>
          <DialogDescription>
            {row ? `${row.teacher_code} — ${row.subject_name}` : null}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSave} className="grid gap-3">
          <div className="grid grid-cols-2 gap-3">
            <label className="grid gap-1 text-sm">
              <span className="text-muted-foreground">Start</span>
              <Input
                type="time"
                value={start}
                onChange={(e) => setStart(e.target.value)}
                required
              />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="text-muted-foreground">End</span>
              <Input
                type="time"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
                required
              />
            </label>
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <DialogFooter className="-mx-4 -mb-4 mt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={busy}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
