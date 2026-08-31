import Link from "next/link"
import { Button } from "@/components/ui/button"
import { getStudents } from "@/lib/backend_faculty_user/student/fetch"
import { getClasses } from "@/lib/backend_faculty_user/class/fetch"
import { StudentManager } from "./_components/student-manager"

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ classId?: string }>
}) {
  const { classId } = await searchParams
  const [students, classes] = await Promise.all([
    getStudents(),
    getClasses(),
  ])

  if (!classId) {
    return (
      <div className="space-y-3">
        <h1 className="text-xl font-semibold">Students</h1>
        <p className="text-sm text-muted-foreground">
          Select a class to view and manage its students.
        </p>
        <Link href="/faculty_user/student/selection">
          <Button>Select Class</Button>
        </Link>
      </div>
    )
  }

  const classIdNum = Number(classId)
  const filtered = Number.isInteger(classIdNum)
    ? students.filter((s) => s.class_id === classIdNum)
    : students

  return (
    <StudentManager initialData={filtered} classes={classes} classId={classIdNum} />
  )
}
