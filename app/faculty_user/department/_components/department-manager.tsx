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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { DepartmentTable } from "./department-table"
import type { DepartmentRow } from "@/lib/backend_faculty_user/department/fetch"
import type { FacultyRow } from "@/lib/types"
import { createDepartment } from "@/lib/backend_faculty_user/department/add"
import { updateDepartment } from "@/lib/backend_faculty_user/department/edit"
import { deleteDepartment } from "@/lib/backend_faculty_user/department/delete"

export function DepartmentManager({
  initialData,
  faculties,
}: {
  initialData: DepartmentRow[]
  faculties: FacultyRow[]
}) {
  const router = useRouter()

  const [formOpen, setFormOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<DepartmentRow | null>(null)
  const [facultyId, setFacultyId] = React.useState<string>("")
  const [error, setError] = React.useState<string | null>(null)

  const [deleteOpen, setDeleteOpen] = React.useState(false)
  const [deleting, setDeleting] = React.useState<DepartmentRow | null>(null)

  function openAdd() {
    setEditing(null)
    setError(null)
    setFacultyId("")
    setFormOpen(true)
  }

  function openEdit(row: DepartmentRow) {
    setEditing(row)
    setError(null)
    setFacultyId(String(row.faculty_id))
    setFormOpen(true)
  }

  function openDelete(row: DepartmentRow) {
    setDeleting(row)
    setDeleteOpen(true)
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const fd = new FormData(e.currentTarget)
    const res = editing
      ? await updateDepartment(editing.id, fd)
      : await createDepartment(fd)

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
    await deleteDepartment(deleting.id)
    setDeleteOpen(false)
    setDeleting(null)
    router.refresh()
  }

  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Departments</h1>
        <Button onClick={openAdd}>Add Department</Button>
      </div>

      <DepartmentTable data={initialData} onEdit={openEdit} onDelete={openDelete} />

      <AlertDialog open={formOpen} onOpenChange={setFormOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {editing ? "Edit Department" : "Add Department"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {editing
                ? "Update the faculty and department name below."
                : "Choose a faculty and enter a department name."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="faculty_id">Faculty</Label>
              <Select
                value={facultyId || undefined}
                onValueChange={(v) => setFacultyId(v ?? "")}
              >
                <SelectTrigger id="faculty_id" className="w-full">
                  <SelectValue placeholder="Select faculty" />
                </SelectTrigger>
                <SelectContent>
                  {faculties.map((f) => (
                    <SelectItem key={f.id} value={String(f.id)}>
                      {f.faculty_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <input type="hidden" name="faculty_id" value={facultyId} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="department_name">Department Name</Label>
              <Input
                id="department_name"
                name="department_name"
                placeholder="e.g. Computer Science"
                defaultValue={editing?.department_name ?? ""}
              />
            </div>
            {error ? (
              <p className="text-sm text-destructive">{error}</p>
            ) : null}
            <AlertDialogFooter>
              <AlertDialogCancel type="button">Cancel</AlertDialogCancel>
              <Button type="submit">{editing ? "Save" : "Add"}</Button>
            </AlertDialogFooter>
          </form>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Department</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete{" "}
              <span className="font-medium">{deleting?.department_name}</span>?
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
