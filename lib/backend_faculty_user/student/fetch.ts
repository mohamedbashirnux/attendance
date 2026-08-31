"use server"

import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/backend_super_admin/auth/auth"

export type StudentStatus = "pending" | "approved"

export type StudentRow = {
  id: number
  student_id: string
  class_id: number
  class_name: string
  department_name: string
  full_name: string
  phone: string | null
  status: StudentStatus
  created_at: string
}

export async function getStudents(): Promise<StudentRow[]> {
  const session = await auth()
  const facultyId = (session?.user as any)?.faculty_id as number | undefined
  if (!facultyId) return []

  const rows = await prisma.students.findMany({
    where: { classes: { departments: { faculty_id: facultyId } } },
    include: { classes: { include: { departments: true } } },
    orderBy: { full_name: "asc" },
  })
  return rows.map((r) => ({
    id: r.id,
    student_id: r.student_id,
    class_id: r.class_id,
    class_name: r.classes.class_name,
    department_name: r.classes.departments.department_name,
    full_name: r.full_name,
    phone: r.phone,
    status: r.status as StudentStatus,
    created_at: r.created_at.toISOString(),
  }))
}
