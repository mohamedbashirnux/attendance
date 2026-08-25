import { getClasses } from "@/lib/backend_faculty_user/class/fetch"
import { getDepartments } from "@/lib/backend_faculty_user/department/fetch"
import { ClassManager } from "./_components/class-manager"

export default async function Page() {
  const rows = await getClasses()
  const departments = await getDepartments()
  return <ClassManager initialData={rows} departments={departments} />
}
