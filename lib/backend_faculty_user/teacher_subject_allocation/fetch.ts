"use server"

import { prisma } from "@/lib/prisma"

export type AllocationRow = {
  id: number
  teacher_id: number
  teacher_code: string
  teacher_name: string
  class_id: number
  class_name: string
  subject_id: number
  subject_name: string
  start_time: string
  end_time: string
  status: string | null
}

export async function getAllocations(): Promise<AllocationRow[]> {
  const rows = await prisma.teacher_subject_allocation.findMany({
    include: { teachers: true, classes: true, subjects: true },
    orderBy: { id: "asc" },
  })
  return rows.map((r) => ({
    id: r.id,
    teacher_id: r.teacher_id,
    teacher_code: r.teachers.teacher_id,
    teacher_name: r.teachers.full_name,
    class_id: r.class_id,
    class_name: r.classes.class_name,
    subject_id: r.subject_id,
    subject_name: r.subjects.subject_name,
    start_time: r.start_time.toISOString(),
    end_time: r.end_time.toISOString(),
    status: r.status,
  }))
}

export async function getAllocationsByClass(classId: number): Promise<AllocationRow[]> {
  const rows = await prisma.teacher_subject_allocation.findMany({
    where: { class_id: classId },
    include: { teachers: true, classes: true, subjects: true },
    orderBy: { id: "asc" },
  })
  return rows.map((r) => ({
    id: r.id,
    teacher_id: r.teacher_id,
    teacher_code: r.teachers.teacher_id,
    teacher_name: r.teachers.full_name,
    class_id: r.class_id,
    class_name: r.classes.class_name,
    subject_id: r.subject_id,
    subject_name: r.subjects.subject_name,
    start_time: r.start_time.toISOString(),
    end_time: r.end_time.toISOString(),
    status: r.status,
  }))
}

export type ClassViewInfo = {
  department_name: string
  class_name: string
  study_mode: string | null
  semester: string | null
  subjects: { id: number; subject_name: string }[]
}

export async function getTeacherAllocationView(
  classId: number,
): Promise<{ classInfo: ClassViewInfo | null; allocations: AllocationRow[] }> {
  const cls = await prisma.classes.findUnique({
    where: { id: classId },
    include: { departments: true, subject_class: { include: { subjects: true } } },
  })
  if (!cls) return { classInfo: null, allocations: [] }

  const rows = await prisma.teacher_subject_allocation.findMany({
    where: { class_id: classId },
    include: { teachers: true, classes: true, subjects: true },
    orderBy: { id: "asc" },
  })

  return {
    classInfo: {
      department_name: cls.departments.department_name,
      class_name: cls.class_name,
      study_mode: cls.study_mode,
      semester: cls.semester,
      subjects: cls.subject_class.map((sc) => ({
        id: sc.subject_id,
        subject_name: sc.subjects.subject_name,
      })),
    },
    allocations: rows.map((r) => ({
      id: r.id,
      teacher_id: r.teacher_id,
      teacher_code: r.teachers.teacher_id,
      teacher_name: r.teachers.full_name,
      class_id: r.class_id,
      class_name: r.classes.class_name,
      subject_id: r.subject_id,
      subject_name: r.subjects.subject_name,
      start_time: r.start_time.toISOString(),
      end_time: r.end_time.toISOString(),
      status: r.status,
    })),
  }
}
