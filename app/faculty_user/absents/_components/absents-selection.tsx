"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { DepartmentRow } from "@/lib/backend_faculty_user/department/fetch"
import type { ScClass } from "@/lib/backend_faculty_user/subject_class/fetch"

export function AbsentsSelection({
  departments,
  classes,
}: {
  departments: DepartmentRow[]
  classes: ScClass[]
}) {
  const router = useRouter()
  const [departmentId, setDepartmentId] = React.useState("")
  const [classId, setClassId] = React.useState("")

  const classOptions = React.useMemo(
    () => (departmentId ? classes.filter((c) => c.department_id === Number(departmentId)) : classes),
    [departmentId, classes],
  )

  function onDeptChange(v: string | null) {
    setDepartmentId(v ?? "")
    setClassId("")
  }
  function goView() {
    if (!classId) return
    router.push(`/faculty_user/absents?classId=${classId}`)
  }

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <h1 className="text-xl font-semibold">Manage Absents</h1>

      <div className="space-y-3 rounded-md border p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Department</Label>
            <Select value={departmentId || undefined} onValueChange={onDeptChange}>
              <SelectTrigger className="w-full">
                <SelectValue>
                  {(val) => {
                    const d = departments.find((x) => String(x.id) === val)
                    return d ? d.department_name : "Select department"
                  }}
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
              value={classId || undefined}
              onValueChange={(v) => setClassId(v ?? "")}
              disabled={!departmentId}
            >
              <SelectTrigger className="w-full">
                <SelectValue>
                  {(val) => {
                    const c = classOptions.find((x) => String(x.id) === val)
                    return c ? c.class_name : "Select class"
                  }}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {classOptions.map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>
                    {c.class_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex justify-center">
          <Button onClick={goView} disabled={!classId}>
            View Absents
          </Button>
        </div>
      </div>
    </div>
  )
}
