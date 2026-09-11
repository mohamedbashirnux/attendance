import { getFaculties } from "@/lib/backend_super_admin/faculty/fetch"
import { FacultyLoginForm } from "./_components/faculty-login-form"

export default async function Page() {
  const faculties = await getFaculties()
  return (
    <div className="flex min-h-svh w-full items-center justify-center bg-[#fafafa] p-6 md:p-10">
      <div className="w-full max-w-sm">
        <FacultyLoginForm faculties={faculties} />
      </div>
    </div>
  )
}
