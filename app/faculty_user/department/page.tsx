import { getDepartments } from "@/lib/backend_faculty_user/department/fetch"
import { DepartmentManager } from "./_components/department-manager"

export default async function Page() {
  const rows = await getDepartments()
  return <DepartmentManager initialData={rows} />
}
