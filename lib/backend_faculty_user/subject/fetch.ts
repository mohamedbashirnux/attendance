"use server"

import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/backend_super_admin/auth/auth"

export type SubjectRow = {
  id: number
  faculty_id: number
  faculty_name: string
  department_id: number
  department_name: string
  subject_name: string
  created_at: string
}

export async function getSubjects(): Promise<SubjectRow[]> {
  const session = await auth()
  const facultyId = (session?.user as any)?.faculty_id as number | undefined
  if (!facultyId) return []

  const rows = await prisma.subjects.findMany({
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
    subject_name: r.subject_name,
    created_at: r.created_at.toISOString(),
  }))
}
