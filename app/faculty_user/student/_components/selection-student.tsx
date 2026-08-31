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
import type { ClassRow } from "@/lib/backend_faculty_user/class/fetch"
import {
  studyModeOptions,
  semesterOptions,
  labelFor,
} from "@/lib/backend_faculty_user/class/enums"

export function SelectionStudent({
  departments,
  classes,
}: {
  departments: DepartmentRow[]
  classes: ClassRow[]
}) {
  const router = useRouter()
  const [departmentId, setDepartmentId] = React.useState<string | null>(null)
  const [classId, setClassId] = React.useState<string | null>(null)

  const classesForDept = classes.filter(
    (c) => String(c.department_id) === departmentId
  )
  const deptName = (id: string) =>
    departments.find((d) => String(d.id) === id)?.department_name ?? ""
  const classLabel = (c: ClassRow) =>
    `${c.class_name} · ${labelFor(studyModeOptions, c.study_mode)} · ${labelFor(
      semesterOptions,
      c.semester
    )} · ${c.academic_year}`

  function go() {
    if (classId) {
      router.push(`/faculty_user/student?classId=${classId}`)
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Students</h1>
      <p className="text-sm text-muted-foreground">
        Select a department and class to manage its students.
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Department</Label>
          <Select
            value={departmentId}
            onValueChange={(v) => {
              setDepartmentId(v ?? null)
              setClassId(null)
            }}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select department">
                {(val) => deptName(val ?? "") || "Select department"}
              </SelectValue>
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
            value={classId}
            onValueChange={(v) => setClassId(v ?? null)}
            disabled={!departmentId}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select class">
                {(val) => {
                  const c = classes.find((x) => String(x.id) === val)
                  return c ? classLabel(c) : "Select class"
                }}
              </SelectValue>
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
