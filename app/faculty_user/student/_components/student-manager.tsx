"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
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
import { StudentTable } from "./student-table"
import type { StudentRow } from "@/lib/backend_faculty_user/student/fetch"
import type { ClassRow } from "@/lib/backend_faculty_user/class/fetch"
import {
  studyModeOptions,
  semesterOptions,
  labelFor,
} from "@/lib/backend_faculty_user/class/enums"
import { createStudent } from "@/lib/backend_faculty_user/student/add"
import { updateStudent } from "@/lib/backend_faculty_user/student/edit"
import { deleteStudent } from "@/lib/backend_faculty_user/student/delete"
import { setClassStudentsStatus } from "@/lib/backend_faculty_user/student/status"

const STATUS_OPTIONS = [
  { value: "approved", label: "Approved" },
  { value: "pending", label: "Pending" },
] as const

export function StudentManager({
  initialData,
  classes,
  classId,
}: {
  initialData: StudentRow[]
  classes: ClassRow[]
  classId?: number
}) {
  const router = useRouter()

  const [formOpen, setFormOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<StudentRow | null>(null)
  const [pickedClassId, setPickedClassId] = React.useState<string | null>(
    classId ? String(classId) : null
  )
  const [status, setStatus] = React.useState<string | null>("approved")
  const [error, setError] = React.useState<string | null>(null)

  const [deleteOpen, setDeleteOpen] = React.useState(false)
  const [deleting, setDeleting] = React.useState<StudentRow | null>(null)
  const [markAllBusy, setMarkAllBusy] = React.useState(false)
  const [pageError, setPageError] = React.useState<string | null>(null)

  const currentClass = classId
    ? classes.find((c) => c.id === classId)
    : undefined

  function openAdd() {
    setEditing(null)
    setError(null)
    setPickedClassId(classId ? String(classId) : null)
    setStatus("approved")
    setFormOpen(true)
  }

  function openEdit(row: StudentRow) {
    setEditing(row)
    setError(null)
    setPickedClassId(String(row.class_id))
    setStatus(row.status)
    setFormOpen(true)
  }

  function openDelete(row: StudentRow) {
    setDeleting(row)
    setDeleteOpen(true)
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const fd = new FormData(e.currentTarget)
    const res = editing
      ? await updateStudent(editing.id, fd)
      : await createStudent(fd)

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
    await deleteStudent(deleting.id)
    setDeleteOpen(false)
    setDeleting(null)
    router.refresh()
  }

  // Toggle button: if every student in the current class is "approved",
  // the next click sets them all to "pending", and vice versa. If the
  // class is mixed, the next click sets everyone to "approved".
  const markAllTarget: "approved" | "pending" = (() => {
    if (initialData.length === 0) return "approved"
    const allApproved = initialData.every((s) => s.status === "approved")
    return allApproved ? "pending" : "approved"
  })()

  async function handleMarkAll() {
    if (!classId) return
    setMarkAllBusy(true)
    setPageError(null)
    const res = await setClassStudentsStatus(classId, markAllTarget)
    setMarkAllBusy(false)
    if (res && "error" in res) {
      setPageError(res.error ?? "Could not update students")
      return
    }
    router.refresh()
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold">Students</h1>
          {currentClass ? (
            <p className="text-sm text-muted-foreground">
              {currentClass.class_name} · {labelFor(studyModeOptions, currentClass.study_mode)} ·{" "}
              {labelFor(semesterOptions, currentClass.semester)} ·{" "}
              {currentClass.academic_year}
            </p>
          ) : null}
        </div>
        <div className="flex gap-2">
          <Link href="/faculty_user/student/selection">
            <Button variant="outline">Change Class</Button>
          </Link>
          {classId ? (
            <Button
              variant="outline"
              onClick={handleMarkAll}
              disabled={markAllBusy || initialData.length === 0}
              title={
                markAllTarget === "pending"
                  ? "Set all students in this class to pending"
                  : "Set all students in this class to approved"
              }
            >
              {markAllBusy
                ? "Updating…"
                : markAllTarget === "pending"
                ? "Mark All Pending"
                : "Mark All Approved"}
            </Button>
          ) : null}
          <Button onClick={openAdd}>
            {editing ? "Edit Student" : "Add Student"}
          </Button>
        </div>
      </div>

      {pageError ? (
        <p className="text-sm text-destructive">{pageError}</p>
      ) : null}

      <StudentTable data={initialData} onEdit={openEdit} onDelete={openDelete} />

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editing ? "Edit Student" : "Add Student"}
            </DialogTitle>
            <DialogDescription>
              {editing
                ? "Update the student details below."
                : "Enter the student's details and assign them to a class."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="student_id">Student ID</Label>
              <Input
                id="student_id"
                name="student_id"
                placeholder="e.g. S001"
                defaultValue={editing?.student_id ?? ""}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="full_name">Full Name</Label>
              <Input
                id="full_name"
                name="full_name"
                placeholder="e.g. Ahmed Hassan"
                defaultValue={editing?.full_name ?? ""}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone">Phone (optional)</Label>
              <Input
                id="phone"
                name="phone"
                placeholder="e.g. +252 61 234 5678"
                defaultValue={editing?.phone ?? ""}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="class_id">Class</Label>
              <Select
                value={pickedClassId}
                onValueChange={(v) => setPickedClassId(v ?? null)}
              >
                <SelectTrigger id="class_id" className="w-full">
                  <SelectValue placeholder="Select class">
                    {(val) => {
                      const c = classes.find((x) => String(x.id) === val)
                      return c ? c.class_name : "Select class"
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {classes.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.class_name} · {labelFor(studyModeOptions, c.study_mode)} ·{" "}
                      {labelFor(semesterOptions, c.semester)} · {c.academic_year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <input type="hidden" name="class_id" value={pickedClassId ?? ""} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="status">Status</Label>
              <Select
                value={status}
                onValueChange={(v) => setStatus(v ?? null)}
              >
                <SelectTrigger id="status" className="w-full">
                  <SelectValue placeholder="Select status">
                    {(val) =>
                      STATUS_OPTIONS.find((o) => o.value === val)?.label ??
                      "Select status"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <input type="hidden" name="status" value={status ?? ""} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">
                Password {editing ? "(leave blank to keep current)" : ""}
              </Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder={editing ? "Leave blank to keep" : "Set a password"}
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
            <AlertDialogTitle>Delete Student</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete{" "}
              <span className="font-medium">{deleting?.full_name}</span>? This
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
