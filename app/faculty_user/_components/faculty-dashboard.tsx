import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import type { DashboardClass } from "@/lib/backend_faculty_user/dashboard/fetch"

export function FacultyDashboard({ classes }: { classes: DashboardClass[] }) {
  if (classes.length === 0) {
    return (
      <div className="rounded-md border p-8 text-center text-muted-foreground">
        No classes found for this selection.
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {classes.map((c) => (
            <Card key={c.id}>
              <CardHeader>
                <CardTitle>
                  {c.class_name} ({c.study_mode_label})
                </CardTitle>
                <CardDescription>{c.department_name}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Absent Rate</span>
                    <span className="font-medium">{c.absent_rate}%</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-2 rounded-full bg-red-500 transition-all"
                      style={{ width: `${c.absent_rate}%` }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="text-xs text-muted-foreground">Absent Students</div>
                    <div className="text-xl font-semibold">{c.absent_students}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Total Students</div>
                    <div className="text-xl font-semibold">{c.total_students}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
      ))}
    </div>
  )
}
