import { getAbsenceClassView } from "@/lib/backend_faculty_user/absences/fetch"
import { AbsenceView } from "./_components/absence-view"

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ classId?: string }>
}) {
  const { classId } = await searchParams
  const view = classId
    ? await getAbsenceClassView(Number(classId))
    : { classInfo: null, summary: [] }
  return (
    <AbsenceView summary={view.summary} classInfo={view.classInfo} classId={classId ?? ""} />
  )
}
