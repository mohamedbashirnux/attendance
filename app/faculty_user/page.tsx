import { getFacultyDashboardClasses } from "@/lib/backend_faculty_user/dashboard/fetch"
import { getDepartments } from "@/lib/backend_faculty_user/department/fetch"
import { FacultyDashboard } from "./_components/faculty-dashboard"
import { DepartmentFilter } from "./_components/department-filter"

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ departmentId?: string }>
}) {
  const { departmentId } = await searchParams
  const [classes, departments] = await Promise.all([
    getFacultyDashboardClasses(departmentId ? Number(departmentId) : undefined),
    getDepartments(),
  ])

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Faculty Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Overview of all your classes and their absent rates.
          </p>
        </div>
        <DepartmentFilter departments={departments} current={departmentId} />
      </div>
      <FacultyDashboard classes={classes} />
    </div>
  )
}
