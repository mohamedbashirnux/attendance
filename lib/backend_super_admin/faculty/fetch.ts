"use server"

import { prisma } from "@/lib/prisma"
import type { FacultyRow } from "@/lib/types"

export async function getFaculties(): Promise<FacultyRow[]> {
  const rows = await prisma.faculty.findMany({ orderBy: { id: "asc" } })
  return rows.map((r) => ({
    id: r.id,
    faculty_name: r.faculty_name,
    created_at: r.created_at,
  }))
}
