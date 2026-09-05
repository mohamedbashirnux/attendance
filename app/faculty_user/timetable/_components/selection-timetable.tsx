"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { DepartmentRow } from "@/lib/backend_faculty_user/department/fetch"
import type { TimetableClassRow } from "@/lib/backend_faculty_user/timetable/fetch"
import {
  studyModeOptions,
  semesterOptions,
  labelFor,
} from "@/lib/backend_faculty_user/class/enums"

export function SelectionTimetable({
  departments,
  classes,
}: {
  departments: DepartmentRow[]
  classes: TimetableClassRow[]
}) {
  const router = useRouter()
  const [departmentId, setDepartmentId] = React.useState<string>("")
  const [classId, setClassId] = React.useState<string>("")

  const classesForDept = classes.filter(
    (c) => String(c.department_id) === departmentId
  )
  const classLabel = (c: TimetableClassRow) =>
    `${c.class_name} · ${labelFor(studyModeOptions, c.study_mode ?? "")} · ${labelFor(
      semesterOptions,
      c.semester ?? ""
    )}`

  function go() {
    if (classId) {
      router.push(`/faculty_user/timetable?classId=${classId}`)
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Time Table</h1>
      <p className="text-sm text-muted-foreground">
        Select a department and class to manage its timetable.
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Department</Label>
          <Select
            value={departmentId || undefined}
            onValueChange={(v) => {
              setDepartmentId(v ?? "")
              setClassId("")
            }}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select department" />
            </SelectTrigger>
            <SelectContent>
              {departments.map((d) => (
                <SelectItem key={d.id} value={String(d.id)}>
                  {d.department_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label>Class</Label>
          <Select
            value={classId || undefined}
            onValueChange={(v) => setClassId(v ?? "")}
            disabled={!departmentId}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select class" />
            </SelectTrigger>
            <SelectContent>
              {classesForDept.map((c) => (
                <SelectItem key={c.id} value={String(c.id)}>
                  {classLabel(c)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Button onClick={go} disabled={!classId}>
        Continue
      </Button>
    </div>
  )
}
