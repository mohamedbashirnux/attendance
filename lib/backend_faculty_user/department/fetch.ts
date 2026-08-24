"use server"

import { prisma } from "@/lib/prisma"
import type { FacultyRow } from "@/lib/types"

export type DepartmentRow = {
  id: number
  faculty_id: number
  faculty_name: string
  department_name: string
}

export async function getDepartments(): Promise<DepartmentRow[]> {
  const rows = await prisma.departments.findMany({
    include: { faculty: true },
    orderBy: { id: "asc" },
  })
  return rows.map((r) => ({
    id: r.id,
    faculty_id: r.faculty_id,
    faculty_name: r.faculty.faculty_name,
    department_name: r.department_name,
  }))
}

export type { FacultyRow }
