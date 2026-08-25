import { getSubjectClassData } from "@/lib/backend_faculty_user/subject_class/fetch"
import { AbsentsSelection } from "../_components/absents-selection"

export default async function Page() {
  const sc = await getSubjectClassData()
  return <AbsentsSelection departments={sc.departments} classes={sc.classes} />
}
