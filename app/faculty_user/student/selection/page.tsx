import { getDepartments } from "@/lib/backend_faculty_user/department/fetch"
import { getClasses } from "@/lib/backend_faculty_user/class/fetch"
import { SelectionStudent } from "../_components/selection-student"

export default async function Page() {
  const [departments, classes] = await Promise.all([
    getDepartments(),
    getClasses(),
  ])

  return (
    <SelectionStudent departments={departments} classes={classes} />
  )
}
