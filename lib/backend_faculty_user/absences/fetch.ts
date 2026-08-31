"use server"

import { prisma } from "@/lib/prisma"

export type AbsenceSummaryRow = {
  student_id: string
  student_name: string
  subject_name: string
  absent_sessions: number
  total_sessions: number
  attendance_pct: number
}

export type AbsenceClassInfo = {
  department_name: string
  class_name: string
  study_mode: string | null
  semester: string | null
}

export async function getAbsenceClassView(
  classId: number,
): Promise<{ classInfo: AbsenceClassInfo | null; summary: AbsenceSummaryRow[] }> {
  const cls = await prisma.classes.findUnique({
    where: { id: classId },
    include: { departments: true },
  })
  if (!cls) return { classInfo: null, summary: [] }

  const [students, subjectClasses, sessions, absences] = await Promise.all([
    prisma.students.findMany({
      where: { class_id: classId },
      select: { id: true, student_id: true, full_name: true },
    }),
    prisma.subject_class.findMany({
      where: { class_id: classId },
      include: { subjects: true },
    }),
    prisma.attendance_sessions.findMany({
      where: { subject_class: { class_id: classId } },
      select: { subject_class_id: true },
    }),
    prisma.absences.findMany({
      where: { students: { class_id: classId } },
      select: { student_id: true, subject_class_id: true },
    }),
  ])

  const totalBySubject = new Map<number, number>()
  for (const s of sessions) {
    totalBySubject.set(s.subject_class_id, (totalBySubject.get(s.subject_class_id) ?? 0) + 1)
  }

  const absentByStudentSubject = new Map<number, Map<number, number>>()
  for (const a of absences) {
    if (!absentByStudentSubject.has(a.student_id)) {
      absentByStudentSubject.set(a.student_id, new Map())
    }
    const m = absentByStudentSubject.get(a.student_id)!
    m.set(a.subject_class_id, (m.get(a.subject_class_id) ?? 0) + 1)
  }

  const summary: AbsenceSummaryRow[] = []
  for (const sc of subjectClasses) {
    const total = totalBySubject.get(sc.id) ?? 0
    if (total === 0) continue
    const subjectName = sc.subjects.subject_name
    for (const stu of students) {
      const absent = absentByStudentSubject.get(stu.id)?.get(sc.id) ?? 0
      const pct = total > 0 ? Math.round(((total - absent) / total) * 10000) / 100 : 0
      summary.push({
        student_id: stu.student_id,
        student_name: stu.full_name,
        subject_name: subjectName,
        absent_sessions: absent,
        total_sessions: total,
        attendance_pct: pct,
      })
    }
  }

  return {
    classInfo: {
      department_name: cls.departments.department_name,
      class_name: cls.class_name,
      study_mode: cls.study_mode,
      semester: cls.semester,
    },
    summary,
  }
}
