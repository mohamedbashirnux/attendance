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
import { SubjectTable } from "./subject-table"
import type { SubjectRow } from "@/lib/backend_faculty_user/subject/fetch"
import type { DepartmentRow } from "@/lib/backend_faculty_user/department/fetch"
import { createSubject } from "@/lib/backend_faculty_user/subject/add"
import { updateSubject } from "@/lib/backend_faculty_user/subject/edit"
import { deleteSubject } from "@/lib/backend_faculty_user/subject/delete"

export function SubjectManager({
  initialData,
  departments,
}: {
  initialData: SubjectRow[]
  departments: DepartmentRow[]
}) {
  const router = useRouter()

  const [formOpen, setFormOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<SubjectRow | null>(null)
  const [departmentId, setDepartmentId] = React.useState<string>("")
  const [error, setError] = React.useState<string | null>(null)

  const [deleteOpen, setDeleteOpen] = React.useState(false)
  const [deleting, setDeleting] = React.useState<SubjectRow | null>(null)

  function openAdd() {
    setEditing(null)
    setError(null)
    setDepartmentId("")
    setFormOpen(true)
  }

  function openEdit(row: SubjectRow) {
    setEditing(row)
    setError(null)
    setDepartmentId(String(row.department_id))
    setFormOpen(true)
  }

  function openDelete(row: SubjectRow) {
    setDeleting(row)
    setDeleteOpen(true)
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const fd = new FormData(e.currentTarget)
    const res = editing
      ? await updateSubject(editing.id, fd)
      : await createSubject(fd)

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
    await deleteSubject(deleting.id)
    setDeleteOpen(false)
    setDeleting(null)
    router.refresh()
  }

  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Subjects</h1>
        <Button onClick={openAdd}>Add Subject</Button>
      </div>

      <SubjectTable data={initialData} onEdit={openEdit} onDelete={openDelete} />

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editing ? "Edit Subject" : "Add Subject"}
            </DialogTitle>
            <DialogDescription>
              {editing
                ? "Update the subject details below."
                : "Choose a department and enter a subject name."}
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
              <Label htmlFor="subject_name">Subject Name</Label>
              <Input
                id="subject_name"
                name="subject_name"
                placeholder="e.g. Mathematics"
                defaultValue={editing?.subject_name ?? ""}
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
            <AlertDialogTitle>Delete Subject</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete{" "}
              <span className="font-medium">{deleting?.subject_name}</span>?
              This action cannot be undone.
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
