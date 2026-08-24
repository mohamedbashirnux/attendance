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
import { FacultyUsersTable } from "./faculty-users-table"
import type { FacultyUserRow } from "@/lib/backend_super_admin/faculty_users/fetch"
import type { FacultyRow } from "@/lib/types"
import { createFacultyUser } from "@/lib/backend_super_admin/faculty_users/add"
import { updateFacultyUser } from "@/lib/backend_super_admin/faculty_users/edit"
import { deleteFacultyUser } from "@/lib/backend_super_admin/faculty_users/delete"

export function FacultyUsersManager({
  initialData,
  faculties,
}: {
  initialData: FacultyUserRow[]
  faculties: FacultyRow[]
}) {
  const router = useRouter()

  const [formOpen, setFormOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<FacultyUserRow | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const [facultyId, setFacultyId] = React.useState<string>("")

  const [deleteOpen, setDeleteOpen] = React.useState(false)
  const [deleting, setDeleting] = React.useState<FacultyUserRow | null>(null)

  function openAdd() {
    setEditing(null)
    setError(null)
    setFacultyId("")
    setFormOpen(true)
  }

  function openEdit(row: FacultyUserRow) {
    setEditing(row)
    setError(null)
    setFacultyId(String(row.faculty_id))
    setFormOpen(true)
  }

  function openDelete(row: FacultyUserRow) {
    setDeleting(row)
    setDeleteOpen(true)
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const fd = new FormData(e.currentTarget)
    const res = editing
      ? await updateFacultyUser(editing.id, fd)
      : await createFacultyUser(fd)

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
    await deleteFacultyUser(deleting.id)
    setDeleteOpen(false)
    setDeleting(null)
    router.refresh()
  }

  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Faculty Users</h1>
        <Button onClick={openAdd}>Add Faculty User</Button>
      </div>

      <FacultyUsersTable
        data={initialData}
        onEdit={openEdit}
        onDelete={openDelete}
      />

      <AlertDialog open={formOpen} onOpenChange={setFormOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {editing ? "Edit Faculty User" : "Add Faculty User"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {editing
                ? "Update the faculty, username or password below."
                : "Choose a faculty, then set a username and password."}
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
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                name="username"
                placeholder="e.g. fac1_login"
                defaultValue={editing?.username ?? ""}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder={editing ? "Leave blank to keep current" : ""}
                autoComplete="new-password"
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
            <AlertDialogTitle>Delete Faculty User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete
              {" "}
              <span className="font-medium">{deleting?.username}</span>?
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
