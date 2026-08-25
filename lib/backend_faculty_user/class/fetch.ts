"use server"

import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/backend_super_admin/auth/auth"

export type ClassRow = {
  id: number
  faculty_id: number
  faculty_name: string
  department_id: number
  department_name: string
  class_name: string
  study_mode: string
  semester: string
  academic_year: string
  created_at: string
}

export async function getClasses(): Promise<ClassRow[]> {
  const session = await auth()
  const facultyId = (session?.user as any)?.faculty_id as number | undefined
  if (!facultyId) return []

  const rows = await prisma.classes.findMany({
    where: { faculty_id: facultyId },
    include: { faculty: true, departments: true },
    orderBy: { id: "asc" },
  })
  return rows.map((r) => ({
    id: r.id,
    faculty_id: r.faculty_id,
    faculty_name: r.faculty.faculty_name,
    department_id: r.department_id,
    department_name: r.departments.department_name,
    class_name: r.class_name,
    study_mode: r.study_mode,
    semester: r.semester,
    academic_year: r.academic_year,
    created_at: r.created_at.toISOString(),
  }))
}
