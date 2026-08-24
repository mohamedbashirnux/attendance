import { getDepartments } from "@/lib/backend_faculty_user/department/fetch"
import { getFaculties } from "@/lib/backend_super_admin/faculty/fetch"
import { DepartmentManager } from "./_components/department-manager"

export default async function Page() {
  const rows = await getDepartments()
  const faculties = await getFaculties()
  return <DepartmentManager initialData={rows} faculties={faculties} />
}
