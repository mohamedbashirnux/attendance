import { getFacultyUsers } from "@/lib/backend_super_admin/faculty_users/fetch"
import { getFaculties } from "@/lib/backend_super_admin/faculty/fetch"
import { FacultyUsersManager } from "./_components/faculty-users-manager"

export default async function Page() {
  const [users, faculties] = await Promise.all([
    getFacultyUsers(),
    getFaculties(),
  ])

  return (
    <FacultyUsersManager initialData={users} faculties={faculties} />
  )
}
