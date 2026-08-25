"use server"

import { prisma } from "@/lib/prisma"

export type TeacherRow = {
  id: number
  teacher_id: string
  faculty_id: number
  faculty_name: string
  full_name: string
  username: string
  created_at: string
}

export async function getTeachers(): Promise<TeacherRow[]> {
  const rows = await prisma.teachers.findMany({
    include: { faculty: true },
    orderBy: { id: "asc" },
  })
  return rows.map((r) => ({
    id: r.id,
    teacher_id: r.teacher_id,
    faculty_id: r.faculty_id,
    faculty_name: r.faculty.faculty_name,
    full_name: r.full_name,
    username: r.username,
    created_at: r.created_at.toISOString(),
  }))
}

export type TeacherLookup = { id: number; teacher_id: string; full_name: string }

export async function getTeacherByCode(code: string): Promise<TeacherLookup | null> {
  const row = await prisma.teachers.findUnique({ where: { teacher_id: code } })
  if (!row) return null
  return { id: row.id, teacher_id: row.teacher_id, full_name: row.full_name }
}
