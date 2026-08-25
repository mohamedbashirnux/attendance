import { getTeachers } from "@/lib/backend_faculty_user/teacher/fetch"
import { TeacherManager } from "./_components/teacher-manager"

export default async function Page() {
  const rows = await getTeachers()
  return <TeacherManager initialData={rows} />
}
