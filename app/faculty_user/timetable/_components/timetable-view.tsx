"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Plus, Pencil, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
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
import {
  studyModeOptions,
  semesterOptions,
  labelFor,
} from "@/lib/backend_faculty_user/class/enums"
import type {
  TimetableRow,
  TimetableViewInfo,
} from "@/lib/backend_faculty_user/timetable/fetch"
import {
  createTimetable,
  updateTimetable,
  deleteTimetable,
} from "@/lib/backend_faculty_user/timetable/save"

const DAY_OPTIONS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const

// Trim ":00" seconds from "HH:MM:SS" for display and the time input.
function shortTime(t: string): string {
  return t.length >= 5 ? t.slice(0, 5) : t
}

type Props = {
  classId: number
  data: { classInfo: TimetableViewInfo; entries: TimetableRow[] }
}

export function TimetableView({ classId, data }: Props) {
  const router = useRouter()
  const { classInfo, entries } = data

  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<TimetableRow | null>(null)
  const [allocationId, setAllocationId] = React.useState<string>("")
  const [day, setDay] = React.useState<string>("")
  const [location, setLocation] = React.useState<string>("")
  const [error, setError] = React.useState<string | null>(null)
  const [saving, setSaving] = React.useState(false)
  const [deletingId, setDeletingId] = React.useState<number | null>(null)

  function openAdd() {
    setEditing(null)
    setAllocationId("")
    setDay("")
    setLocation("")
    setError(null)
    setDialogOpen(true)
  }

  function openEdit(row: TimetableRow) {
    setEditing(row)
    setAllocationId(String(row.allocation_id))
    setDay(row.day_of_week)
    setLocation(row.location_hall ?? "")
    setError(null)
    setDialogOpen(true)
  }

  // Auto-derived from the picked allocation. Used only for display in
  // the form (the DB has no time_start / time_end on the timetable
  // table itself — the live time comes from the allocation).
  const pickedAlloc = classInfo.allocations.find(
    (a) => String(a.id) === allocationId
  )

  async function save() {
    setError(null)
    if (!allocationId || !day) {
      setError("Please fill in all required fields")
      return
    }
    setSaving(true)

    const form = new FormData()
    if (editing) form.set("id", String(editing.id))
    form.set("allocation_id", allocationId)
    form.set("class_id", String(classId))
    form.set("day_of_week", day)
    form.set("location_hall", location)

    const res = editing ? await updateTimetable(form) : await createTimetable(form)
    setSaving(false)
    if (res && "error" in res) {
      setError(res.error ?? "Could not save")
      return
    }
    setDialogOpen(false)
    router.refresh()
  }

  async function onDelete(row: TimetableRow) {
    if (!confirm(`Delete the ${row.subject_name} class on ${row.day_of_week}?`)) {
      return
    }
    setDeletingId(row.id)
    const res = await deleteTimetable(row.id, classId)
    setDeletingId(null)
    if (res && "error" in res) {
      alert(res.error)
      return
    }
    router.refresh()
  }

  const groupedByDay = React.useMemo(() => {
    const map = new Map<string, TimetableRow[]>()
    for (const d of DAY_OPTIONS) map.set(d, [])
    for (const e of entries) {
      const list = map.get(e.day_of_week) ?? []
      list.push(e)
      map.set(e.day_of_week, list)
    }
    return map
  }, [entries])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Time Table</h1>
        <div className="flex gap-2">
          <Link href="/faculty_user/timetable/selection">
            <Button variant="outline">Change Class</Button>
          </Link>
          <Button onClick={openAdd} disabled={classInfo.allocations.length === 0}>
            <Plus className="mr-1 size-4" />
            Add Timetable Entry
          </Button>
        </div>
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
              {labelFor(studyModeOptions, classInfo.study_mode ?? "")} ·{" "}
              {labelFor(semesterOptions, classInfo.semester ?? "")}
            </div>
          </div>
        </div>

        {classInfo.allocations.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No teacher subject allocations yet. Add a teacher subject allocation
            first, then come back to fill in the timetable.
          </p>
        ) : null}
      </div>

      <div className="space-y-4">
        {DAY_OPTIONS.map((d) => {
          const list = groupedByDay.get(d) ?? []
          if (list.length === 0) return null
          return (
            <div key={d} className="rounded-md border">
              <div className="border-b bg-muted/40 px-3 py-2 text-sm font-medium">
                {d}
              </div>
              <ul className="divide-y">
                {list
                  .slice()
                  .sort((a, b) => a.time_start.localeCompare(b.time_start))
                  .map((row) => (
                    <li
                      key={row.id}
                      className="flex flex-wrap items-center gap-3 px-3 py-2 text-sm"
                    >
                      <div className="font-mono text-xs">
                        {shortTime(row.time_start)} – {shortTime(row.time_end)}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium">{row.subject_name}</div>
                        <div className="text-xs text-muted-foreground">
                          {row.teacher_name} ({row.teacher_code})
                          {row.location_hall ? ` · ${row.location_hall}` : ""}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEdit(row)}
                          aria-label="Edit"
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onDelete(row)}
                          disabled={deletingId === row.id}
                          aria-label="Delete"
                        >
                          <Trash2 className="size-4 text-destructive" />
                        </Button>
                      </div>
                    </li>
                  ))}
              </ul>
            </div>
          )
        })}
        {entries.length === 0 ? (
          <p className="rounded-md border p-4 text-center text-sm text-muted-foreground">
            No timetable entries yet. Click &quot;Add Timetable Entry&quot; to
            create one.
          </p>
        ) : null}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Edit Timetable Entry" : "Add Timetable Entry"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Subject</Label>
              <Select
                value={allocationId || undefined}
                onValueChange={(v) => setAllocationId(v ?? "")}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select subject" />
                </SelectTrigger>
                <SelectContent>
                  {classInfo.allocations.map((a) => (
                    <SelectItem key={a.id} value={String(a.id)}>
                      {a.subject_name} · {a.teacher_name} ·{" "}
                      {shortTime(a.start_time)}–{shortTime(a.end_time)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Teacher</Label>
              <Input
                value={pickedAlloc?.teacher_name ?? ""}
                readOnly
                placeholder="(auto-filled)"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Day of Week</Label>
              <Select
                value={day || undefined}
                onValueChange={(v) => setDay(v ?? "")}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select day" />
                </SelectTrigger>
                <SelectContent>
                  {DAY_OPTIONS.map((d) => (
                    <SelectItem key={d} value={d}>
                      {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Location / Hall</Label>
              <Input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Hall A, Lab 2"
              />
            </div>

            {error ? (
              <p className="text-sm text-destructive">{error}</p>
            ) : null}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button onClick={save} disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
