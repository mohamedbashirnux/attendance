import Link from "next/link"
import { Button } from "@/components/ui/button"
import { getSubjectClassData } from "@/lib/backend_faculty_user/subject_class/fetch"
import { SubjectClassView } from "./_components/subject-class-view"

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ classId?: string }>
}) {
  const { classId } = await searchParams
  const data = await getSubjectClassData()

  if (!classId) {
    return (
      <div className="space-y-3">
        <h1 className="text-xl font-semibold">Subject Class</h1>
        <p className="text-sm text-muted-foreground">
          Select a class to view and manage its subjects.
        </p>
        <Link href="/faculty_user/subject-class/selection">
          <Button>Select Class</Button>
        </Link>
      </div>
    )
  }

  return <SubjectClassView data={data} classId={Number(classId)} />
}
