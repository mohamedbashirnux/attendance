import { getFaculties } from "@/lib/backend_super_admin/faculty/fetch"
import { FacultyManager } from "./_components/faculty-manager"

export default async function Page() {
  const faculties = await getFaculties()
  return <FacultyManager initialData={faculties} />
}
