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
import { setWaiting } from "@/lib/backend_faculty_user/teacher_subject_allocation/actions"

const helper = createColumnHelper<TableFeatures, AllocationRow>()

function fmtTime(v: string): string {
  const t = v.includes("T") ? v.split("T")[1] : v
  return t.slice(0, 5)
}

function liveOf(row: AllocationRow, now: Date): AllocationStatus {
  return computeLiveStatus(row.status, new Date(row.start_time), new Date(row.end_time), now)
}

function StatusBadge({ status }: { status: AllocationStatus }) {
  const c = statusColors[status]
  return (
    <span
      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${c.bg} ${c.text} ${c.border}`}
    >
      {c.label}
    </span>
  )
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
  // Re-evaluate "now" every 30s so the live status (waiting/approved) updates
  // as time passes, without a manual page refresh.
  const [now, setNow] = React.useState<Date>(() => new Date())
  React.useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000)
    return () => clearInterval(t)
  }, [])

  async function handleRowClick(row: AllocationRow) {
    setError(null)
    // Only allow clicking when the stored status is "pending" (waiting/approved
    // are managed by time, not by clicks).
    if (row.status !== "pending") {
      setError(`This allocation is already "${row.status}". Wait for the time window or for the session to end.`)
      return
    }
    setBusyId(row.id)
    const res = await setWaiting(row.id)
    setBusyId(null)
    if (res && "error" in res) {
      setError(res.error ?? "Could not allow allocation")
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
          const live = liveOf(info.row.original, now)
          return <StatusBadge status={live} />
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
            onClick={(e) => {
              e.stopPropagation()
              onDelete(info.row.original)
            }}
          >
            Delete
          </Button>
        ),
      }),
    ],
    [now],
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
              table.getRowModel().rows.map((row) => {
                const live = liveOf(row.original, now)
                const clickable = row.original.status === "pending"
                return (
                  <tr
                    key={row.id}
                    className={`border-b last:border-0 ${
                      clickable ? "cursor-pointer hover:bg-muted/40" : ""
                    }`}
                    onClick={clickable ? () => handleRowClick(row.original) : undefined}
                  >
                    {row.getAllCells().map((cell) => (
                      <td key={cell.id} className="px-4 py-2">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
