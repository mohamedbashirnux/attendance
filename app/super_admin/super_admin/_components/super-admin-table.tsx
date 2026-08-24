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
import type { SuperAdminRow } from "@/lib/backend_super_admin/super_admin/fetch"
import { Button } from "@/components/ui/button"

const helper = createColumnHelper<TableFeatures, SuperAdminRow>()

function formatDate(value: SuperAdminRow["created_at"]) {
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return "-"
  const p = (n: number) => String(n).padStart(2, "0")
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(
    date.getDate(),
  )} ${p(date.getHours())}:${p(date.getMinutes())}:${p(date.getSeconds())}`
}

export function SuperAdminTable({
  data,
  onEdit,
  onDelete,
}: {
  data: SuperAdminRow[]
  onEdit: (row: SuperAdminRow) => void
  onDelete: (row: SuperAdminRow) => void
}) {
  const columns = React.useMemo(
    (): ColumnDef<TableFeatures, SuperAdminRow, any>[] => [
      helper.accessor("id", { header: "ID" }),
      helper.accessor("full_name", { header: "Full Name" }),
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
    [onEdit, onDelete],
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
                        header.getContext(),
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
                No super admins yet.
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
