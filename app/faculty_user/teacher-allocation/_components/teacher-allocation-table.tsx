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
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { statusColors, type AllocationStatus } from "@/lib/backend_faculty_user/teacher_subject_allocation/set-status"
import { setStatus } from "@/lib/backend_faculty_user/teacher_subject_allocation/actions"

const helper = createColumnHelper<TableFeatures, AllocationRow>()

function fmtTime(v: string): string {
  const t = v.includes("T") ? v.split("T")[1] : v
  return t.slice(0, 5)
}

const ALL_STATUSES: AllocationStatus[] = ["pending", "waiting", "approved"]

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
  const [selected, setSelected] = React.useState<AllocationRow | null>(null)
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [busy, setBusy] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  function openChangeDialog(row: AllocationRow) {
    setSelected(row)
    setError(null)
    setDialogOpen(true)
  }

  async function pickStatus(next: AllocationStatus) {
    if (!selected) return
    setBusy(true)
    setError(null)
    const res = await setStatus(selected.id, next)
    setBusy(false)
    if (res && "error" in res) {
      setError(res.error ?? "Could not change status")
      return
    }
    setDialogOpen(false)
    setSelected(null)
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
          const status = (info.row.original.status ?? "pending") as AllocationStatus
          return <StatusBadge status={status} />
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
    [],
  )

  const table = useTable({
    features: tableFeatures({ ...coreFeatures, coreRowModel: createCoreRowModel() }),
    columns,
    data,
  })

  const currentStatus: AllocationStatus =
    (selected?.status ?? "pending") as AllocationStatus

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
                <tr
                  key={row.id}
                  className="cursor-pointer border-b last:border-0 hover:bg-muted/40"
                  onClick={() => openChangeDialog(row.original)}
                >
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Status</DialogTitle>
            <DialogDescription>
              {selected
                ? `Set the status for ${selected.teacher_name} — ${selected.subject_name} (${fmtTime(selected.start_time)}–${fmtTime(selected.end_time)}).`
                : "Select a status for this allocation."}
            </DialogDescription>
          </DialogHeader>

          {selected ? (
            <div className="space-y-3">
              <div className="text-sm">
                Current status: <StatusBadge status={currentStatus} />
              </div>
              <div className="flex flex-wrap gap-2">
                {ALL_STATUSES.map((s) => {
                  const c = statusColors[s]
                  const isCurrent = s === currentStatus
                  return (
                    <Button
                      key={s}
                      variant="outline"
                      className={`rounded-md border ${c.border} ${c.text} ${c.bg} hover:opacity-80`}
                      disabled={busy || isCurrent}
                      onClick={() => pickStatus(s)}
                    >
                      {isCurrent ? `${c.label} (current)` : `Set ${c.label}`}
                    </Button>
                  )
                })}
              </div>
              {error ? <p className="text-sm text-destructive">{error}</p> : null}
            </div>
          ) : null}

          <DialogFooter>
            <DialogClose render={<Button variant="outline" className="rounded-md" />}>
              Close
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
