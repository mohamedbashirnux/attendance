import { getTeacherAllocationView } from "@/lib/backend_faculty_user/teacher_subject_allocation/fetch"
import { TeacherAllocationView } from "./_components/teacher-allocation-view"

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ classId?: string }>
}) {
  const { classId } = await searchParams
  const view = classId
    ? await getTeacherAllocationView(Number(classId))
    : { classInfo: null, allocations: [] }
  return (
    <TeacherAllocationView
      allocations={view.allocations}
      classInfo={view.classInfo}
      classId={classId ?? ""}
    />
  )
}
