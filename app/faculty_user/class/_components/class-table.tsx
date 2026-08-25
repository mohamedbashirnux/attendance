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
import type { ClassRow } from "@/lib/backend_faculty_user/class/fetch"
import { studyModeOptions, semesterOptions, labelFor } from "@/lib/backend_faculty_user/class/enums"
import { Button } from "@/components/ui/button"

const helper = createColumnHelper<TableFeatures, ClassRow>()

function fmt(iso: string): string {
  return iso.includes("T") ? iso.replace("T", " ").slice(0, 19) : iso
}

export function ClassTable({
  data,
  onEdit,
  onDelete,
}: {
  data: ClassRow[]
  onEdit: (row: ClassRow) => void
  onDelete: (row: ClassRow) => void
}) {
  const columns = React.useMemo(
    (): ColumnDef<TableFeatures, ClassRow, any>[] => [
      helper.accessor("id", { header: "ID" }),
      helper.accessor("department_name", { header: "Department" }),
      helper.accessor("class_name", { header: "Class" }),
      helper.accessor("study_mode", {
        header: "Study Mode",
        cell: (info) => labelFor(studyModeOptions, info.getValue()),
      }),
      helper.accessor("semester", {
        header: "Semester",
        cell: (info) => labelFor(semesterOptions, info.getValue()),
      }),
      helper.accessor("academic_year", { header: "Academic Year" }),
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
                No classes yet.
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
