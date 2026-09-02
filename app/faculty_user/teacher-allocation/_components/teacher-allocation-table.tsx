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
import {
  computeLiveStatus,
  statusColors,
  type AllocationStatus,
} from "@/lib/backend_faculty_user/teacher_subject_allocation/set-status"
import { nowToMs, timeToMs } from "@/lib/backend_faculty_user/teacher_subject_allocation/time"
import { changeStatus } from "@/lib/backend_faculty_user/teacher_subject_allocation/actions"

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
function hintFor(row: AllocationRow, now: Date): string | null {
  const live = liveOf(row, now)
  const startMs = timeToMs(row.start_time)
  const endMs = timeToMs(row.end_time)
  const nowMs = nowToMs(now)

  if (live === "pending") {
    const diff = startMs - nowMs
    if (diff <= 0) return "Class can be allowed now"
    return `Class starts in ${fmtCountdown(diff)}`
  }
  if (live === "waiting") {
    const diff = startMs - nowMs
    if (diff <= 0) return "Auto-approving now"
    return `Auto-approve in ${fmtCountdown(diff)}`
  }
  // live === "approved"
  const diff = endMs - nowMs
  if (diff <= 0) return "Session ended"
  return `Class ends in ${fmtCountdown(diff)}`
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
        cell: (info) => (
          <Button
            size="sm"
            variant="destructive"
            className="rounded-md"
            onClick={() => onDelete(info.row.original)}
          >
            Delete
          </Button>
        ),
      }),
    ],
    [busyId, now],
  )

  const table = useTable({
    features: tableFeatures({ ...coreFeatures, coreRowModel: createCoreRowModel() }),
    columns,
    data,
  })

  return (
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
  )
}
