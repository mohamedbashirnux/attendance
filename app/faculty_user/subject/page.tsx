import { getSubjects } from "@/lib/backend_faculty_user/subject/fetch"
import { getDepartments } from "@/lib/backend_faculty_user/department/fetch"
import { SubjectManager } from "./_components/subject-manager"

export default async function Page() {
  const rows = await getSubjects()
  const departments = await getDepartments()
  return <SubjectManager initialData={rows} departments={departments} />
}
