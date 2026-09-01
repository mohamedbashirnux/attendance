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
  type LiveStatus,
} from "@/lib/backend_faculty_user/teacher_subject_allocation/set-status"
import { setWaiting } from "@/lib/backend_faculty_user/teacher_subject_allocation/actions"

const helper = createColumnHelper<TableFeatures, AllocationRow>()

function fmtTime(v: string): string {
  const t = v.includes("T") ? v.split("T")[1] : v
  return t.slice(0, 5)
}

function liveOf(row: AllocationRow, now: Date): LiveStatus {
  return computeLiveStatus(row.status, new Date(row.start_time), new Date(row.end_time), now)
}

function StatusBadge({ live }: { live: LiveStatus }) {
  const c = statusColors[live]
  return (
    <span
      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${c.bg} ${c.text} ${c.border}`}
    >
      {c.label}
    </span>
  )
}

// Explicit hover-bg map because Tailwind needs full class names at build time.
const hoverBgMap: Record<LiveStatus, string> = {
  pending: "hover:bg-yellow-100",
  waiting: "hover:bg-red-100",
  approved: "hover:bg-green-100",
}

export function TeacherAllocationTable({
  data,
  onDelete,
  onAllowed,
}: {
  data: AllocationRow[]
  onDelete: (r: AllocationRow) => void
  onAllowed: () => void
}) {
  const [busyId, setBusyId] = React.useState<number | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  // Re-evaluate "now" every 30s so the badge/button update as time passes
  // without the user needing to manually refresh the page.
  const [now, setNow] = React.useState<Date>(() => new Date())
  React.useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000)
    return () => clearInterval(t)
  }, [])

  async function handleAllow(id: number) {
    setError(null)
    setBusyId(id)
    const res = await setWaiting(id)
    setBusyId(null)
    if (res && "error" in res) {
      setError(res.error ?? "Could not allow")
      return
    }
    onAllowed()
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
        cell: (info) => <StatusBadge live={liveOf(info.row.original, now)} />,
      }),
      helper.display({
        id: "actions",
        header: "Actions",
        cell: (info) => {
          const row = info.row.original
          const live = liveOf(row, now)
          // Allow is only meaningful when the row is still in the DB "pending" state.
          // Once it's waiting/approved, the live status updates automatically with time.
          const canAllow = row.status === "pending"
          const c = statusColors[live]
          return (
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                className={`rounded-md border ${c.border} ${c.text} ${hoverBgMap[live]} disabled:opacity-50`}
                disabled={!canAllow || busyId === row.id}
                onClick={() => handleAllow(row.id)}
              >
                {busyId === row.id ? "Allowing…" : "Allow"}
              </Button>
              <Button size="sm" variant="destructive" className="rounded-md" onClick={() => onDelete(row)}>
                Delete
              </Button>
            </div>
          )
        },
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
