"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog"
import type { DepartmentRow } from "@/lib/backend_faculty_user/department/fetch"
import type {
  ScClass,
  ScSubject,
  ScAssignment,
} from "@/lib/backend_faculty_user/subject_class/fetch"
import { saveSubjectClass } from "@/lib/backend_faculty_user/subject_class/save"
import {
  studyModeOptions,
  semesterOptions,
  labelFor,
} from "@/lib/backend_faculty_user/class/enums"

type Props = {
  data: {
    departments: DepartmentRow[]
    classes: ScClass[]
    subjects: ScSubject[]
    assignments: ScAssignment[]
  }
  classId: number
}

export function SubjectClassView({ data, classId }: Props) {
  const router = useRouter()

  const [selected, setSelected] = React.useState<Set<number>>(new Set())
  const [search, setSearch] = React.useState("")
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [saving, setSaving] = React.useState(false)

  const currentClass = data.classes.find((c) => c.id === classId)
  const departmentId = currentClass ? String(currentClass.department_id) : ""
  const deptName = (id: string) =>
    data.departments.find((d) => String(d.id) === id)?.department_name ?? ""

  const assignedSubjectIds = React.useMemo(
    () =>
      new Set(
        data.assignments
          .filter((a) => a.class_id === classId)
          .map((a) => a.subject_id)
      ),
    [data.assignments, classId]
  )
  const subjectsForDept = React.useMemo(
    () =>
      data.subjects.filter((s) => String(s.department_id) === departmentId),
    [data.subjects, departmentId]
  )
  const assignedSubjects = subjectsForDept.filter((s) =>
    assignedSubjectIds.has(s.id)
  )

  function openDialog() {
    setSelected(new Set(assignedSubjectIds))
    setSearch("")
    setDialogOpen(true)
  }

  function toggle(id: number) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function save() {
    setSaving(true)
    setError(null)
    const res = await saveSubjectClass(classId, [...selected])
    setSaving(false)
    if (res && "error" in res) {
      setError(res.error ?? null)
      return
    }
    setDialogOpen(false)
    router.refresh()
  }

  const filteredSubjects = subjectsForDept.filter((s) =>
    s.subject_name.toLowerCase().includes(search.toLowerCase())
  )

  if (!currentClass) {
    return (
      <div className="space-y-3">
        <h1 className="text-xl font-semibold">Subject Class</h1>
        <p className="text-sm text-muted-foreground">Class not found.</p>
        <Link href="/faculty_user/subject-class/selection">
          <Button>Select Class</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Subject Class</h1>
        <Link href="/faculty_user/subject-class/selection">
          <Button variant="outline">Change Class</Button>
        </Link>
      </div>

      <div className="space-y-3 rounded-md border p-4">
        <div className="grid gap-2 sm:grid-cols-3 text-sm">
          <div>
            <div className="text-muted-foreground">Department</div>
            <div className="font-medium">{deptName(departmentId)}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Class</div>
            <div className="font-medium">{currentClass.class_name}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Study Mode / Semester</div>
            <div className="font-medium">
              {labelFor(studyModeOptions, currentClass.study_mode)} ·{" "}
              {labelFor(semesterOptions, currentClass.semester)}
            </div>
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="font-medium">
              Assigned Subjects ({assignedSubjects.length})
            </h2>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <Button variant="outline" onClick={openDialog}>
                Manage Subjects
              </Button>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Assign Subjects</DialogTitle>
                </DialogHeader>
                <Input
                  placeholder="Search subjects..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                <div className="max-h-72 space-y-1 overflow-y-auto">
                  {filteredSubjects.length === 0 ? (
                    <p className="py-4 text-center text-sm text-muted-foreground">
                      No subjects found.
                    </p>
                  ) : (
                    filteredSubjects.map((s) => (
                      <label
                        key={s.id}
                        className="flex cursor-pointer items-center gap-2 rounded-md border p-2"
                      >
                        <Checkbox
                          checked={selected.has(s.id)}
                          onCheckedChange={() => toggle(s.id)}
                        />
                        <span className="text-sm">{s.subject_name}</span>
                      </label>
                    ))
                  )}
                </div>
                <DialogFooter className="sm:justify-between">
                  <span className="text-sm text-muted-foreground">
                    {selected.size} selected
                  </span>
                  <div className="flex gap-2">
                    <DialogClose render={<Button variant="outline" />}>
                      Cancel
                    </DialogClose>
                    <Button onClick={save} disabled={saving}>
                      {saving ? "Saving..." : "Save"}
                    </Button>
                  </div>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {assignedSubjects.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No subjects assigned yet.
            </p>
          ) : (
            <ul className="divide-y rounded-md border">
              {assignedSubjects.map((s) => (
                <li key={s.id} className="px-3 py-2 text-sm">
                  {s.subject_name}
                </li>
              ))}
            </ul>
          )}
        </div>

        {error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : null}
      </div>
    </div>
  )
}
