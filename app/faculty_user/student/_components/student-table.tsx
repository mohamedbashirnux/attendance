"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useTable, flexRender } from "@tanstack/react-table"
import {
  tableFeatures,
  createCoreRowModel,
  createColumnHelper,
  coreFeatures,
  type TableFeatures,
  type ColumnDef,
} from "@tanstack/table-core"
import type { StudentRow, StudentStatus } from "@/lib/backend_faculty_user/student/fetch"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { setStudentStatus } from "@/lib/backend_faculty_user/student/status"

const helper = createColumnHelper<TableFeatures, StudentRow>()

function fmt(iso: string): string {
  return iso.includes("T") ? iso.replace("T", " ").slice(0, 19) : iso
}

// Color tokens for the per-row status badge. Same shape as the
// teacher-allocation badges so the look-and-feel is consistent.
const statusColors: Record<StudentStatus, { bg: string; text: string; border: string }> = {
  approved: { bg: "bg-green-50",  text: "text-green-800",  border: "border-green-300" },
  pending:  { bg: "bg-yellow-50", text: "text-yellow-800", border: "border-yellow-300" },
}

function StatusBadge({
  status,
  onClick,
  busy,
}: {
  status: StudentStatus
  onClick?: () => void
  busy?: boolean
}) {
  const c = statusColors[status]
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick || busy}
      title={onClick ? "Click to toggle" : undefined}
      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${c.bg} ${c.text} ${c.border} ${
        onClick ? "cursor-pointer hover:opacity-80" : "cursor-default"
      }`}
    >
      {status}
    </button>
  )
}

export function StudentTable({
  data,
  onEdit,
  onDelete,
}: {
  data: StudentRow[]
  onEdit: (row: StudentRow) => void
  onDelete: (row: StudentRow) => void
}) {
  const router = useRouter()
  const [busyId, setBusyId] = React.useState<number | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const [search, setSearch] = React.useState("")
  const [mounted, setMounted] = React.useState(false)
  React.useEffect(() => setMounted(true), [])

  // Client-side filter on the columns the user can see in the rows.
  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return data
    return data.filter((r) => {
      return (
        r.student_id.toLowerCase().includes(q) ||
        r.full_name.toLowerCase().includes(q) ||
        (r.phone ?? "").toLowerCase().includes(q) ||
        r.status.toLowerCase().includes(q)
      )
    })
  }, [data, search])

  async function handleBadgeClick(row: StudentRow) {
    setError(null)
    const next: StudentStatus = row.status === "approved" ? "pending" : "approved"
    setBusyId(row.id)
    const res = await setStudentStatus(row.id, next)
    setBusyId(null)
    if (res && "error" in res) {
      setError(res.error ?? "Could not change status")
      return
    }
    router.refresh()
  }

  const columns = React.useMemo(
    (): ColumnDef<TableFeatures, StudentRow, any>[] => [
      helper.display({
        id: "no",
        header: "No.",
        cell: (info) => info.row.index + 1,
      }),
      helper.accessor("student_id", { header: "Student ID" }),
      helper.accessor("full_name", { header: "Full Name" }),
      helper.accessor("phone", {
        header: "Phone",
        cell: (info) => info.getValue() ?? "—",
      }),
      helper.display({
        id: "status",
        header: "Status",
        cell: (info) => {
          const row = info.row.original
          return (
            <StatusBadge
              status={row.status}
              onClick={mounted ? () => handleBadgeClick(row) : undefined}
              busy={busyId === row.id}
            />
          )
        },
      }),
      helper.accessor("created_at", {
        header: "Created",
        cell: (info) => fmt(info.getValue()),
      }),
      helper.display({
        id: "actions",
        header: "Actions",
        cell: (info) => (
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => onEdit(info.row.original)}
            >
              Edit
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => onDelete(info.row.original)}
            >
              Delete
            </Button>
          </div>
        ),
      }),
    ],
    [busyId, mounted, onEdit, onDelete]
  )

  const table = useTable({
    features: tableFeatures({ ...coreFeatures, coreRowModel: createCoreRowModel() }),
    columns,
    data: filtered,
  })

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <Input
          placeholder="Search by ID, name, phone, or status…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
        <p className="text-sm text-muted-foreground">
          {filtered.length} of {data.length}
        </p>
      </div>
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
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-8 text-center text-muted-foreground"
                >
                  {data.length === 0
                    ? "No students yet for this class."
                    : "No students match your search."}
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
