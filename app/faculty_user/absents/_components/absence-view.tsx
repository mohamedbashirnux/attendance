"use client"

import * as React from "react"
import Link from "next/link"
import { useTable, flexRender } from "@tanstack/react-table"
import {
  tableFeatures,
  createCoreRowModel,
  createColumnHelper,
  coreFeatures,
  type TableFeatures,
  type ColumnDef,
} from "@tanstack/table-core"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { AbsenceSummaryRow, AbsenceClassInfo } from "@/lib/backend_faculty_user/absences/fetch"
import { studyModeOptions, semesterOptions, labelFor } from "@/lib/backend_faculty_user/class/enums"

const helper = createColumnHelper<TableFeatures, AbsenceSummaryRow>()

export function AbsenceView({
  summary,
  classInfo,
  classId,
}: {
  summary: AbsenceSummaryRow[]
  classInfo: AbsenceClassInfo | null
  classId: string
}) {
  const [search, setSearch] = React.useState("")

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return summary
    return summary.filter((r) =>
      [r.student_id, r.student_name, r.subject_name].some((f) => f.toLowerCase().includes(q)),
    )
  }, [summary, search])

  const columns = React.useMemo(
    (): ColumnDef<TableFeatures, AbsenceSummaryRow, any>[] => [
      helper.accessor("student_id", { header: "Student ID" }),
      helper.accessor("student_name", { header: "Student Name" }),
      helper.accessor("subject_name", { header: "Subject Name" }),
      helper.accessor("absent_sessions", { header: "Absent Sessions" }),
      helper.accessor("total_sessions", { header: "Total Sessions" }),
      helper.accessor("attendance_pct", {
        header: "Attendance %",
        cell: (info) => `${info.getValue()}%`,
      }),
    ],
    [],
  )

  const table = useTable({
    features: tableFeatures({ ...coreFeatures, coreRowModel: createCoreRowModel() }),
    columns,
    data: filtered,
  })

  if (!classInfo) {
    return (
      <div className="space-y-3">
        <h1 className="text-xl font-semibold">Manage Absents</h1>
        <p className="text-sm text-muted-foreground">Class not found.</p>
        <Link href="/faculty_user/absents/selection">
          <Button>Select Class</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Manage Absents</h1>
        <Link href="/faculty_user/absents/selection">
          <Button variant="outline">Change Class</Button>
        </Link>
      </div>

      <div className="space-y-3 rounded-md border p-4">
        <div className="grid gap-2 sm:grid-cols-3 text-sm">
          <div>
            <div className="text-muted-foreground">Department</div>
            <div className="font-medium">{classInfo.department_name}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Class</div>
            <div className="font-medium">{classInfo.class_name}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Study Mode / Semester</div>
            <div className="font-medium">
              {classInfo.study_mode ? labelFor(studyModeOptions, classInfo.study_mode) : "—"} ·{" "}
              {classInfo.semester ? labelFor(semesterOptions, classInfo.semester) : "—"}
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3">
        <h2 className="font-medium">Attendance Summary ({filtered.length})</h2>
        <Input
          placeholder="Search student ID, name or subject..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
      </div>

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
                  No attendance data for this class.
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
