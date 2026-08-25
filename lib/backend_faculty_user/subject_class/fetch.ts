"use server"

import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/backend_super_admin/auth/auth"
import type { DepartmentRow } from "@/lib/backend_faculty_user/department/fetch"

export type ScClass = {
  id: number
  department_id: number
  class_name: string
  study_mode: string
  semester: string
}
export type ScSubject = { id: number; department_id: number; subject_name: string }
export type ScAssignment = { class_id: number; subject_id: number }

export type SubjectClassData = {
  departments: DepartmentRow[]
  classes: ScClass[]
  subjects: ScSubject[]
  assignments: ScAssignment[]
}

export async function getSubjectClassData(): Promise<SubjectClassData> {
  const session = await auth()
  const facultyId = (session?.user as any)?.faculty_id as number | undefined
  if (!facultyId) {
    return { departments: [], classes: [], subjects: [], assignments: [] }
  }

  const [departments, classes, subjects, assignments] = await Promise.all([
    prisma.departments.findMany({
      where: { faculty_id: facultyId },
      include: { faculty: true },
      orderBy: { id: "asc" },
    }),
    prisma.classes.findMany({
      where: { departments: { faculty_id: facultyId } },
      select: {
        id: true,
        department_id: true,
        class_name: true,
        study_mode: true,
        semester: true,
      },
      orderBy: { id: "asc" },
    }),
    prisma.subjects.findMany({
      where: { departments: { faculty_id: facultyId } },
      select: { id: true, department_id: true, subject_name: true },
      orderBy: { id: "asc" },
    }),
    prisma.subject_class.findMany({
      where: { classes: { departments: { faculty_id: facultyId } } },
      select: { class_id: true, subject_id: true },
    }),
  ])

  return {
    departments: departments.map((r) => ({
      id: r.id,
      faculty_id: r.faculty_id,
      faculty_name: r.faculty.faculty_name,
      department_name: r.department_name,
    })),
    classes: classes as ScClass[],
    subjects: subjects as ScSubject[],
    assignments: assignments as ScAssignment[],
  }
}
