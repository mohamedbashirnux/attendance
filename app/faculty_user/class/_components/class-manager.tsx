"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ClassTable } from "./class-table"
import type { ClassRow } from "@/lib/backend_faculty_user/class/fetch"
import type { DepartmentRow } from "@/lib/backend_faculty_user/department/fetch"
import { studyModeOptions, semesterOptions, labelFor } from "@/lib/backend_faculty_user/class/enums"
import { createClass } from "@/lib/backend_faculty_user/class/add"
import { updateClass } from "@/lib/backend_faculty_user/class/edit"
import { deleteClass } from "@/lib/backend_faculty_user/class/delete"

export function ClassManager({
  initialData,
  departments,
}: {
  initialData: ClassRow[]
  departments: DepartmentRow[]
}) {
  const router = useRouter()

  const [formOpen, setFormOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<ClassRow | null>(null)
  const [departmentId, setDepartmentId] = React.useState<string>("")
  const [studyMode, setStudyMode] = React.useState<string>("")
  const [semester, setSemester] = React.useState<string>("")
  const [error, setError] = React.useState<string | null>(null)

  const [deleteOpen, setDeleteOpen] = React.useState(false)
  const [deleting, setDeleting] = React.useState<ClassRow | null>(null)

  function openAdd() {
    setEditing(null)
    setError(null)
    setDepartmentId("")
    setStudyMode("")
    setSemester("")
    setFormOpen(true)
  }

  function openEdit(row: ClassRow) {
    setEditing(row)
    setError(null)
    setDepartmentId(String(row.department_id))
    setStudyMode(row.study_mode)
    setSemester(row.semester)
    setFormOpen(true)
  }

  function openDelete(row: ClassRow) {
    setDeleting(row)
    setDeleteOpen(true)
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const fd = new FormData(e.currentTarget)
    const res = editing
      ? await updateClass(editing.id, fd)
      : await createClass(fd)

    if (res && "error" in res) {
      setError(res.error ?? null)
      return
    }

    setFormOpen(false)
    setEditing(null)
    router.refresh()
  }

  async function confirmDelete() {
    if (!deleting) return
    await deleteClass(deleting.id)
    setDeleteOpen(false)
    setDeleting(null)
    router.refresh()
  }

  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Classes</h1>
        <Button onClick={openAdd}>Add Class</Button>
      </div>

      <ClassTable data={initialData} onEdit={openEdit} onDelete={openDelete} />

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editing ? "Edit Class" : "Add Class"}
            </DialogTitle>
            <DialogDescription>
              {editing
                ? "Update the class details below."
                : "Fill in the faculty, department and class details."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="department_id">Department</Label>
              <Select
                value={departmentId || undefined}
                onValueChange={(v) => setDepartmentId(v ?? "")}
              >
                <SelectTrigger id="department_id" className="w-full">
                  <SelectValue placeholder="Select department">
                    {(val) =>
                      departments.find((d) => String(d.id) === val)
                        ?.department_name ?? "Select department"}
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
              <input type="hidden" name="department_id" value={departmentId} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="class_name">Class Name</Label>
              <Input
                id="class_name"
                name="class_name"
                placeholder="e.g. CS-1"
                defaultValue={editing?.class_name ?? ""}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="study_mode">Study Mode</Label>
              <Select
                value={studyMode || undefined}
                onValueChange={(v) => setStudyMode(v ?? "")}
              >
                <SelectTrigger id="study_mode" className="w-full">
                  <SelectValue placeholder="Select study mode">
                    {(val) => labelFor(studyModeOptions, val ?? "")}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {studyModeOptions.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <input type="hidden" name="study_mode" value={studyMode} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="semester">Semester</Label>
              <Select
                value={semester || undefined}
                onValueChange={(v) => setSemester(v ?? "")}
              >
                <SelectTrigger id="semester" className="w-full">
                  <SelectValue placeholder="Select semester">
                    {(val) => labelFor(semesterOptions, val ?? "")}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {semesterOptions.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <input type="hidden" name="semester" value={semester} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="academic_year">Academic Year</Label>
              <Input
                id="academic_year"
                name="academic_year"
                placeholder="2024/2025"
                defaultValue={editing?.academic_year ?? ""}
              />
            </div>
            {error ? (
              <p className="text-sm text-destructive">{error}</p>
            ) : null}
            <DialogFooter>
              <DialogClose render={<Button variant="outline" />}>
                Cancel
              </DialogClose>
              <Button type="submit">{editing ? "Save" : "Add"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Class</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete{" "}
              <span className="font-medium">{deleting?.class_name}</span>? This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel type="button">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
