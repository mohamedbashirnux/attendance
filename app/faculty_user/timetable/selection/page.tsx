import { getTimetableClasses } from "@/lib/backend_faculty_user/timetable/fetch"
import { getDepartments } from "@/lib/backend_faculty_user/department/fetch"
import { SelectionTimetable } from "../_components/selection-timetable"

export default async function Page() {
  const [departments, classes] = await Promise.all([
    getDepartments(),
    getTimetableClasses(),
  ])
  return <SelectionTimetable departments={departments} classes={classes} />
}
