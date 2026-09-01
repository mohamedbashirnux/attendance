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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { DepartmentRow } from "@/lib/backend_faculty_user/department/fetch"
import type { ScClass, ScSubject, ScAssignment } from "@/lib/backend_faculty_user/subject_class/fetch"
import { getTeacherByCode } from "@/lib/backend_faculty_user/teacher/fetch"
import { createAllocation } from "@/lib/backend_faculty_user/teacher_subject_allocation/create"

type Props = {
  departments: DepartmentRow[]
  classes: ScClass[]
  subjects: ScSubject[]
  assignments: ScAssignment[]
}

type Lookup = { id: number; full_name: string } | null | undefined

export function TeacherAllocationSelection({ departments, classes, subjects, assignments }: Props) {
  const router = useRouter()
  const [teacherCode, setTeacherCode] = React.useState("")
  const [teacherLookup, setTeacherLookup] = React.useState<Lookup>(undefined)
  const [departmentId, setDepartmentId] = React.useState<string | null>(null)
  const [classId, setClassId] = React.useState<string | null>(null)
  const [subjectId, setSubjectId] = React.useState<string | null>(null)
  const [startTime, setStartTime] = React.useState("")
  const [endTime, setEndTime] = React.useState("")
  const [error, setError] = React.useState<string | null>(null)
  const [viewOpen, setViewOpen] = React.useState(false)
  const [viewDept, setViewDept] = React.useState<string | null>(null)
  const [viewClass, setViewClass] = React.useState<string | null>(null)

  const classOptions = React.useMemo(
    () => (departmentId ? classes.filter((c) => c.department_id === Number(departmentId)) : classes),
    [departmentId, classes],
  )
  const subjectOptions = React.useMemo(
    () =>
      classId
        ? subjects.filter((s) =>
            assignments.some((a) => a.class_id === Number(classId) && a.subject_id === s.id),
          )
        : [],
    [classId, subjects, assignments],
  )
  const viewClassOptions = viewDept
    ? classes.filter((c) => c.department_id === Number(viewDept))
    : classes

  function onDeptChange(v: string | null) {
    setDepartmentId(v)
    setClassId(null)
    setSubjectId(null)
  }
  function onClassChange(v: string | null) {
    setClassId(v)
    setSubjectId(null)
  }

  async function lookupTeacher() {
    const code = teacherCode.trim()
    if (!code) {
      setTeacherLookup(undefined)
      return
    }
    const t = await getTeacherByCode(code)
    setTeacherLookup(t)
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    if (!teacherLookup?.id) {
      setError("Enter a valid teacher ID")
      return
    }
    if (!classId) {
      setError("Select a class")
      return
    }
    if (!subjectId) {
      setError("Select a subject")
      return
    }
    if (!startTime || !endTime) {
      setError("Enter start and end time")
      return
    }
    const fd = new FormData(e.currentTarget)
    fd.set("teacher_id", String(teacherLookup.id))
    fd.set("class_id", classId)
    fd.set("subject_id", subjectId)
    const res = await createAllocation(fd)
    if (res && "error" in res) {
      setError(res.error ?? null)
      return
    }
    setTeacherCode("")
    setTeacherLookup(undefined)
    setDepartmentId(null)
    setClassId(null)
    setSubjectId(null)
    setStartTime("")
    setEndTime("")
    router.refresh()
  }

  function goView() {
    if (!viewClass) return
    router.push(`/faculty_user/teacher-allocation?classId=${viewClass}`)
  }

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <h1 className="text-xl font-semibold">Allocate Teacher Subjects</h1>

      <form onSubmit={handleSubmit} className="space-y-3 rounded-md border p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="teacher_code">Teacher ID</Label>
            <Input
              id="teacher_code"
              value={teacherCode}
              onChange={(e) => setTeacherCode(e.target.value)}
              onBlur={lookupTeacher}
              placeholder="e.g. T001"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="teacher_name">Teacher Name</Label>
            <Input
              id="teacher_name"
              disabled
              value={teacherLookup ? teacherLookup.full_name : ""}
              placeholder={teacherLookup === null ? "Not found" : "Auto-filled"}
            />
            {teacherLookup === null ? (
              <p className="text-sm text-destructive">Teacher not found</p>
            ) : null}
          </div>
          <div className="space-y-1.5">
            <Label>Department</Label>
            <Select value={departmentId} onValueChange={onDeptChange}>
              <SelectTrigger className="w-full">
                <SelectValue>
                  {(val) => {
                    const d = departments.find((x) => String(x.id) === val)
                    return d ? d.department_name : "Select department"
                  }}
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
          </div>
          <div className="space-y-1.5">
            <Label>Class</Label>
            <Select value={classId} onValueChange={onClassChange} disabled={!departmentId}>
              <SelectTrigger className="w-full">
                <SelectValue>
                  {(val) => {
                    const c = classOptions.find((x) => String(x.id) === val)
                    return c ? c.class_name : "Select class"
                  }}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {classOptions.map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>
                    {c.class_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Subject</Label>
            <Select
              value={subjectId}
              onValueChange={(v) => setSubjectId(v)}
              disabled={!classId}
            >
              <SelectTrigger className="w-full">
                <SelectValue>
                  {(val) => {
                    const s = subjectOptions.find((x) => String(x.id) === val)
                    return s ? s.subject_name : "Select subject"
                  }}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {subjectOptions.map((s) => (
                  <SelectItem key={s.id} value={String(s.id)}>
                    {s.subject_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="start_time">Start Time</Label>
            <Input
              id="start_time"
              name="start_time"
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="end_time">End Time</Label>
            <Input
              id="end_time"
              name="end_time"
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
            />
          </div>
        </div>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <div className="flex justify-center gap-3">
          <Button type="submit">Allocate Subject</Button>
          <Button type="button" variant="outline" onClick={() => setViewOpen(true)}>
            View Allocation
          </Button>
        </div>
      </form>

      <AlertDialog open={viewOpen} onOpenChange={setViewOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>View Allocation</AlertDialogTitle>
            <AlertDialogDescription>
              Choose a department and class to view its allocations.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Department</Label>
              <Select
                value={viewDept}
                onValueChange={(v) => {
                  setViewDept(v)
                  setViewClass(null)
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue>
                    {(val) => {
                      const d = departments.find((x) => String(x.id) === val)
                      return d ? d.department_name : "Select department"
                    }}
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
            </div>
            <div className="space-y-1.5">
              <Label>Class</Label>
              <Select
                value={viewClass}
                onValueChange={(v) => setViewClass(v)}
                disabled={!viewDept}
              >
                <SelectTrigger className="w-full">
                  <SelectValue>
                    {(val) => {
                      const c = viewClassOptions.find((x) => String(x.id) === val)
                      return c ? c.class_name : "Select class"
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {viewClassOptions.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.class_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel type="button">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={goView}>View Allocate</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
