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
import { SuperAdminTable } from "./super-admin-table"
import type { SuperAdminRow } from "@/lib/backend_super_admin/super_admin/fetch"
import { createSuperAdmin } from "@/lib/backend_super_admin/super_admin/add"
import { updateSuperAdmin } from "@/lib/backend_super_admin/super_admin/edit"
import { deleteSuperAdmin } from "@/lib/backend_super_admin/super_admin/delete"

export function SuperAdminManager({ initialData }: { initialData: SuperAdminRow[] }) {
  const router = useRouter()

  const [formOpen, setFormOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<SuperAdminRow | null>(null)
  const [error, setError] = React.useState<string | null>(null)

  const [deleteOpen, setDeleteOpen] = React.useState(false)
  const [deleting, setDeleting] = React.useState<SuperAdminRow | null>(null)

  function openAdd() {
    setEditing(null)
    setError(null)
    setFormOpen(true)
  }

  function openEdit(row: SuperAdminRow) {
    setEditing(row)
    setError(null)
    setFormOpen(true)
  }

  function openDelete(row: SuperAdminRow) {
    setDeleting(row)
    setDeleteOpen(true)
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const fd = new FormData(e.currentTarget)
    const res = editing
      ? await updateSuperAdmin(editing.id, fd)
      : await createSuperAdmin(fd)

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
    await deleteSuperAdmin(deleting.id)
    setDeleteOpen(false)
    setDeleting(null)
    router.refresh()
  }

  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Super Admins</h1>
        <Button onClick={openAdd}>Add Super Admin</Button>
      </div>

      <SuperAdminTable
        data={initialData}
        onEdit={openEdit}
        onDelete={openDelete}
      />

      <AlertDialog open={formOpen} onOpenChange={setFormOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {editing ? "Edit Super Admin" : "Add Super Admin"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {editing
                ? "Update the full name, username or password below."
                : "Set a full name, username and password."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="full_name">Full Name</Label>
              <Input
                id="full_name"
                name="full_name"
                placeholder="e.g. Jane Doe"
                defaultValue={editing?.full_name ?? ""}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                name="username"
                placeholder="e.g. jane_admin"
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
            <AlertDialogTitle>Delete Super Admin</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete{" "}
              <span className="font-medium">{deleting?.username}</span>? This
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
