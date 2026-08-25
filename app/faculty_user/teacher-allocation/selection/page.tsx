import { getSubjectClassData } from "@/lib/backend_faculty_user/subject_class/fetch"
import { TeacherAllocationSelection } from "../_components/teacher-allocation-selection"

export default async function Page() {
  const sc = await getSubjectClassData()
  return (
    <TeacherAllocationSelection
      departments={sc.departments}
      classes={sc.classes}
      subjects={sc.subjects}
      assignments={sc.assignments}
    />
  )
}
