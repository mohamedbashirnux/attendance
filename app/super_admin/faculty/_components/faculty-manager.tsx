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
import { FacultyTable } from "./faculty-table"
import type { FacultyRow } from "@/lib/types"
import { createFaculty } from "@/lib/backend_super_admin/faculty/add"
import { updateFaculty } from "@/lib/backend_super_admin/faculty/edit"
import { deleteFaculty } from "@/lib/backend_super_admin/faculty/delete"

export function FacultyManager({ initialData }: { initialData: FacultyRow[] }) {
  const router = useRouter()

  const [formOpen, setFormOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<FacultyRow | null>(null)
  const [error, setError] = React.useState<string | null>(null)

  const [deleteOpen, setDeleteOpen] = React.useState(false)
  const [deleting, setDeleting] = React.useState<FacultyRow | null>(null)

  function openAdd() {
    setEditing(null)
    setError(null)
    setFormOpen(true)
  }

  function openEdit(faculty: FacultyRow) {
    setEditing(faculty)
    setError(null)
    setFormOpen(true)
  }

  function openDelete(faculty: FacultyRow) {
    setDeleting(faculty)
    setDeleteOpen(true)
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const fd = new FormData(e.currentTarget)
    const res = editing
      ? await updateFaculty(editing.id, fd)
      : await createFaculty(fd)

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
    await deleteFaculty(deleting.id)
    setDeleteOpen(false)
    setDeleting(null)
    router.refresh()
  }

  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Faculties</h1>
        <Button onClick={openAdd}>Add Faculty</Button>
      </div>

      <FacultyTable
        data={initialData}
        onEdit={openEdit}
        onDelete={openDelete}
      />

      <AlertDialog open={formOpen} onOpenChange={setFormOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {editing ? "Edit Faculty" : "Add Faculty"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {editing
                ? "Update the faculty name below."
                : "Enter the name for the new faculty."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="faculty_name">Faculty Name</Label>
              <Input
                id="faculty_name"
                name="faculty_name"
                placeholder="e.g. Faculty of Engineering"
                defaultValue={editing?.faculty_name ?? ""}
                autoFocus
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
            <AlertDialogTitle>Delete Faculty</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete
              {" "}
              <span className="font-medium">{deleting?.faculty_name}</span>?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel type="button">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
