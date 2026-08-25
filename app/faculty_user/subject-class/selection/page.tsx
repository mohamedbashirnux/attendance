import { getSubjectClassData } from "@/lib/backend_faculty_user/subject_class/fetch"
import { SelectionSubjectClass } from "../_components/selection-subject-class"

export default async function Page() {
  const data = await getSubjectClassData()
  return (
    <SelectionSubjectClass
      departments={data.departments}
      classes={data.classes}
    />
  )
}
