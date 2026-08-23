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
import type { FacultyUserRow } from "@/lib/backend_super_admin/faculty_users/fetch"
import { Button } from "@/components/ui/button"

const helper = createColumnHelper<TableFeatures, FacultyUserRow>()

function formatDate(value: FacultyUserRow["created_at"]) {
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return "-"
  const p = (n: number) => String(n).padStart(2, "0")
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(
    date.getDate()
  )} ${p(date.getHours())}:${p(date.getMinutes())}:${p(date.getSeconds())}`
}

export function FacultyUsersTable({
  data,
  onEdit,
  onDelete,
}: {
  data: FacultyUserRow[]
  onEdit: (row: FacultyUserRow) => void
  onDelete: (row: FacultyUserRow) => void
}) {
  const columns = React.useMemo(
    (): ColumnDef<TableFeatures, FacultyUserRow, any>[] => [
      helper.accessor("id", { header: "ID" }),
      helper.accessor("faculty_name", { header: "Faculty" }),
      helper.accessor("username", { header: "Username" }),
      helper.accessor("created_at", {
        header: "Created At",
        cell: (info) => formatDate(info.getValue()),
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
    [onEdit, onDelete]
  )

  const table = useTable({
    features: tableFeatures({ ...coreFeatures, coreRowModel: createCoreRowModel() }),
    columns,
    data,
  })

  return (
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
                No faculty users yet.
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
  )
}
