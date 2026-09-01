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
import { changeStatus } from "@/lib/backend_faculty_user/teacher_subject_allocation/actions"

const helper = createColumnHelper<TableFeatures, AllocationRow>()

function fmtTime(v: string): string {
  const t = v.includes("T") ? v.split("T")[1] : v
  return t.slice(0, 5)
}

function liveOf(row: AllocationRow, now: Date | null): AllocationStatus {
  if (!now) return (row.status ?? "pending") as AllocationStatus
  return computeLiveStatus(row.status, new Date(row.start_time), new Date(row.end_time), now)
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
//     * before start         -> 'waiting'   (dean approved, waiting for time)
//     * after end            -> 'waiting'   (re-arm for next session)
// - click on 'waiting'  -> 'approved' (force approval)
// - click on 'approved' -> 'pending'  (reset)
function nextOnClick(
  current: AllocationStatus,
  startTime: Date,
  endTime: Date,
  now: Date | null
): AllocationStatus {
  if (current === "waiting") return "approved"
  if (current === "approved") return "pending"

  // current === "pending"
  if (!now) return "waiting"
  const nowMs =
    now.getHours() * 3600_000 + now.getMinutes() * 60_000 + now.getSeconds() * 1000
  const startMs =
    startTime.getHours() * 3600_000 +
    startTime.getMinutes() * 60_000 +
    startTime.getSeconds() * 1000
  const endMs =
    endTime.getHours() * 3600_000 +
    endTime.getMinutes() * 60_000 +
    endTime.getSeconds() * 1000

  // Inside the window -> dean + time both ok -> go straight to approved
  if (nowMs >= startMs && nowMs <= endMs) return "approved"
  // Otherwise just stage the dean's approval -> waiting
  return "waiting"
}

export function TeacherAllocationTable({
  data,
  onDelete,
  onChanged,
}: {
  data: AllocationRow[]
  onDelete: (r: AllocationRow) => void
  onChanged: () => void
}) {
  const [busyId, setBusyId] = React.useState<number | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  // Track the current "now" on the client only. Start with null so SSR and
  // the first client render agree (avoids a hydration mismatch), then set
  // it in an effect and refresh every 30s.
  const [now, setNow] = React.useState<Date | null>(null)
  // Mounted flag so the badge is non-interactive during SSR / first paint.
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
    const next = nextOnClick(
      current,
      new Date(row.start_time),
      new Date(row.end_time),
      now
    )
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
          return (
            <StatusBadge
              status={live}
              onClick={mounted ? () => handleBadgeClick(row) : undefined}
              busy={busyId === row.id}
            />
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
