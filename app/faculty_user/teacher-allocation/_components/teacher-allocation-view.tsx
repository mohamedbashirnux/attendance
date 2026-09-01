"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
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
import { TeacherAllocationTable } from "./teacher-allocation-table"
import { deleteAllocation } from "@/lib/backend_faculty_user/teacher_subject_allocation/delete"
import type { AllocationRow, ClassViewInfo } from "@/lib/backend_faculty_user/teacher_subject_allocation/fetch"
import { studyModeOptions, semesterOptions, labelFor } from "@/lib/backend_faculty_user/class/enums"

type Props = {
  allocations: AllocationRow[]
  classInfo: ClassViewInfo | null
  classId: string
  serverNow: string
}

export function TeacherAllocationView({ allocations, classInfo, classId, serverNow }: Props) {
  const router = useRouter()
  const [deleting, setDeleting] = React.useState<AllocationRow | null>(null)

  async function confirmDelete() {
    if (!deleting) return
    await deleteAllocation(deleting.id)
    setDeleting(null)
    router.refresh()
  }

  if (!classInfo) {
    return (
      <div className="space-y-3">
        <h1 className="text-xl font-semibold">Teacher Allocation</h1>
        <p className="text-sm text-muted-foreground">Class not found.</p>
        <Link href="/faculty_user/teacher-allocation/selection">
          <Button>Select Class</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Teacher Allocation</h1>
        <Link href="/faculty_user/teacher-allocation/selection">
          <Button variant="outline">Change Class</Button>
        </Link>
      </div>

      <div className="space-y-3 rounded-md border p-4">
        <div className="grid gap-2 sm:grid-cols-3 text-sm">
          <div>
            <div className="text-muted-foreground">Department</div>
            <div className="font-medium">{classInfo.department_name}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Class</div>
            <div className="font-medium">{classInfo.class_name}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Study Mode / Semester</div>
            <div className="font-medium">
              {classInfo.study_mode ? labelFor(studyModeOptions, classInfo.study_mode) : "—"} ·{" "}
              {classInfo.semester ? labelFor(semesterOptions, classInfo.semester) : "—"}
            </div>
          </div>
        </div>
      </div>

      <h2 className="font-medium">Allocations</h2>
      <TeacherAllocationTable
        data={allocations}
        onDelete={(r) => setDeleting(r)}
        onChanged={() => router.refresh()}
        serverNow={serverNow}
      />

      <AlertDialog open={!!deleting} onOpenChange={(o) => { if (!o) setDeleting(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Allocation</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this allocation? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel type="button">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
