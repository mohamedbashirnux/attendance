"use server"

import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/backend_super_admin/auth/auth"
import { studyModeOptions, semesterOptions, labelFor } from "@/lib/backend_faculty_user/class/enums"

export type DashboardClass = {
  id: number
  class_name: string
  department_name: string
  study_mode_label: string
  semester_label: string
  total_students: number
  absent_students: number
  absent_rate: number
}

export async function getFacultyDashboardClasses(departmentId?: number): Promise<DashboardClass[]> {
  const session = await auth()
  const facultyId = (session?.user as any)?.faculty_id as number | undefined
  if (!facultyId) return []

  const classes = await prisma.classes.findMany({
    where: departmentId
      ? { departments: { faculty_id: facultyId, id: departmentId } }
      : { departments: { faculty_id: facultyId } },
    include: { departments: true },
    orderBy: { id: "asc" },
  })

  const data = await Promise.all(
    classes.map(async (c) => {
      const [total, absentGroups] = await Promise.all([
        prisma.students.count({ where: { class_id: c.id } }),
        prisma.absences.findMany({
          where: { students: { class_id: c.id } },
          select: { student_id: true },
          distinct: ["student_id"],
        }),
      ])
      const absent = absentGroups.length
      const rate = total ? Math.round((absent / total) * 100) : 0
      return {
        id: c.id,
        class_name: c.class_name,
        department_name: c.departments.department_name,
        study_mode_label: labelFor(studyModeOptions, c.study_mode),
        semester_label: labelFor(semesterOptions, c.semester),
        total_students: total,
        absent_students: absent,
        absent_rate: rate,
      }
    })
  )

  return data
}
