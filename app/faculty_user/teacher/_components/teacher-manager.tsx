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
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog"
import { TeacherTable } from "./teacher-table"
import type { TeacherRow } from "@/lib/backend_faculty_user/teacher/fetch"
import { createTeacher } from "@/lib/backend_faculty_user/teacher/add"
import { updateTeacher } from "@/lib/backend_faculty_user/teacher/edit"
import { deleteTeacher } from "@/lib/backend_faculty_user/teacher/delete"

export function TeacherManager({ initialData }: { initialData: TeacherRow[] }) {
  const router = useRouter()
  const [formOpen, setFormOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<TeacherRow | null>(null)
  const [teacherId, setTeacherId] = React.useState("")
  const [error, setError] = React.useState<string | null>(null)
  const [deleteOpen, setDeleteOpen] = React.useState(false)
  const [deleting, setDeleting] = React.useState<TeacherRow | null>(null)
  const [search, setSearch] = React.useState("")

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return initialData
    return initialData.filter((r) =>
      [r.teacher_id, r.full_name, r.username, r.faculty_name].some((f) =>
        f.toLowerCase().includes(q),
      ),
    )
  }, [initialData, search])

  function openAdd() {
    setEditing(null)
    setError(null)
    setTeacherId("")
    setFormOpen(true)
  }
  function openEdit(row: TeacherRow) {
    setEditing(row)
    setError(null)
    setTeacherId(row.teacher_id)
    setFormOpen(true)
  }
  function openDelete(row: TeacherRow) {
    setDeleting(row)
    setDeleteOpen(true)
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const fd = new FormData(e.currentTarget)
    const res = editing ? await updateTeacher(editing.id, fd) : await createTeacher(fd)
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
    await deleteTeacher(deleting.id)
    setDeleteOpen(false)
    setDeleting(null)
    router.refresh()
  }

  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Teachers</h1>
        <Button onClick={openAdd}>Add Teacher</Button>
      </div>

      <Input
        placeholder="Search by teacher ID, name, username or faculty..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-sm"
      />

      <TeacherTable data={filtered} onEdit={openEdit} onDelete={openDelete} />

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Teacher" : "Add Teacher"}</DialogTitle>
            <DialogDescription>
              {editing
                ? "Update the teacher details below."
                : "Record a new teacher under your faculty. Teachers are visible across all faculties."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="teacher_id">Teacher ID</Label>
              <Input
                id="teacher_id"
                name="teacher_id"
                placeholder="e.g. T001"
                defaultValue={editing?.teacher_id ?? ""}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="full_name">Full Name</Label>
              <Input
                id="full_name"
                name="full_name"
                placeholder="e.g. John Doe"
                defaultValue={editing?.full_name ?? ""}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                name="username"
                placeholder="e.g. johndoe"
                defaultValue={editing?.username ?? ""}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password {editing ? "(leave blank to keep)" : ""}</Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder={editing ? "••••••••" : "Password"}
                defaultValue=""
              />
            </div>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <DialogFooter>
              <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
              <Button type="submit">{editing ? "Save" : "Add"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Teacher</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <span className="font-medium">{deleting?.full_name}</span>? This
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
