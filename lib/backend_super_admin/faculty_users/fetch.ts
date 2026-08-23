"use server"

import { prisma } from "@/lib/prisma"

export type FacultyUserRow = {
  id: number
  faculty_id: number
  faculty_name: string
  username: string
  created_at: Date
}

export async function getFacultyUsers(): Promise<FacultyUserRow[]> {
  const rows = await prisma.faculty_users.findMany({
    orderBy: { id: "asc" },
    include: { faculty: { select: { faculty_name: true } } },
  })

  return rows.map((r) => ({
    id: r.id,
    faculty_id: r.faculty_id,
    faculty_name: r.faculty.faculty_name,
    username: r.username,
    created_at: r.created_at,
  }))
}
