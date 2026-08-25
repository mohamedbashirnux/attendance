"use server"

import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/backend_super_admin/auth/auth"

export type ClassRow = {
  id: number
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
    where: { departments: { faculty_id: facultyId } },
    include: { departments: true },
    orderBy: { id: "asc" },
  })
  return rows.map((r) => ({
    id: r.id,
    department_id: r.department_id,
    department_name: r.departments.department_name,
    class_name: r.class_name,
    study_mode: r.study_mode,
    semester: r.semester,
    academic_year: r.academic_year,
    created_at: r.created_at.toISOString(),
  }))
}
