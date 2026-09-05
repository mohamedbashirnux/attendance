import Link from "next/link"
import { Button } from "@/components/ui/button"
import { getTimetableView } from "@/lib/backend_faculty_user/timetable/fetch"
import { TimetableView } from "./_components/timetable-view"

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ classId?: string }>
}) {
  const { classId } = await searchParams

  if (!classId) {
    return (
      <div className="space-y-3">
        <h1 className="text-xl font-semibold">Time Table</h1>
        <p className="text-sm text-muted-foreground">
          Select a class to view and manage its timetable.
        </p>
        <Link href="/faculty_user/timetable/selection">
          <Button>Select Class</Button>
        </Link>
      </div>
    )
  }

  const data = await getTimetableView(Number(classId))

  if (!data.classInfo) {
    return (
      <div className="space-y-3">
        <h1 className="text-xl font-semibold">Time Table</h1>
        <p className="text-sm text-muted-foreground">Class not found.</p>
        <Link href="/faculty_user/timetable/selection">
          <Button>Select Class</Button>
        </Link>
      </div>
    )
  }

  return (
    <TimetableView
      classId={Number(classId)}
      data={{ classInfo: data.classInfo!, entries: data.entries }}
    />
  )
}
