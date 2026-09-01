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
  // Pass the server's current time (as an ISO string) so the table's first
  // client render uses the same 'now' as the server render and there is no
  // visible 'blink' on refresh. The client then takes over and updates the
  // time every 30s.
  const serverNow = new Date().toISOString()
  return (
    <TeacherAllocationView
      allocations={view.allocations}
      classInfo={view.classInfo}
      classId={classId ?? ""}
      serverNow={serverNow}
    />
  )
}
