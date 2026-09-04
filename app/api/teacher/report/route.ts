import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { verifyTeacherToken, corsHeaders } from "@/lib/teacher-api/auth"

// Map excuse values to the human-readable string the mobile expects.
// Prisma's TS enum uses underscores ("Family_Emergency"); the underlying
// DB column stores the spaced form ("Family Emergency") via @map. Either
// form can come back depending on the path Prisma took (typed select vs
// raw), so we cover both keys. Anything we don't recognize falls back
// to "No Excuse" instead of echoing a raw underscored value back to the
// mobile.
const EXCUSE_LABELS: Record<string, string> = {
  Family_Emergency: "Family Emergency",
  "Family Emergency": "Family Emergency",
  Medical_Appointment: "Medical Appointment",
  "Medical Appointment": "Medical Appointment",
  Personal_Reason: "Personal Reason",
  "Personal Reason": "Personal Reason",
  Official_Duty: "Official Duty",
  "Official Duty": "Official Duty",
  Other: "Other",
  No_Excuse: "No Excuse",
  "No Excuse": "No Excuse",
}

function excuseLabel(v: string | null | undefined): string {
  if (!v) return "No Excuse"
  return EXCUSE_LABELS[v] ?? "No Excuse"
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders })
}

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization")
  const token = auth?.startsWith("Bearer ") ? auth.slice(7) : null
  if (!token) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401, headers: corsHeaders }
    )
  }

  const teacherId = await verifyTeacherToken(token)
  if (!teacherId) {
    return NextResponse.json(
      { error: "Invalid or expired token" },
      { status: 401, headers: corsHeaders }
    )
  }

  // 1. Get class_id and subject_id from query params
  const url = req.nextUrl
  const classIdParam = url.searchParams.get("class_id")
  const subjectIdParam = url.searchParams.get("subject_id")
  const subjectClassIdParam = url.searchParams.get("subject_class_id")

  if (!classIdParam && !subjectClassIdParam) {
    return NextResponse.json(
      { error: "class_id + subject_id are required (or subject_class_id)" },
      { status: 400, headers: corsHeaders }
    )
  }

  // 2. Find the teacher
  const teacher = await prisma.teachers.findUnique({
    where: { teacher_id: teacherId },
    include: {
      teacher_subject_allocation: {
        include: {
          subject_class: {
            include: {
              classes: { include: { departments: true } },
              subjects: true,
            },
          },
        },
      },
    },
  })
  if (!teacher) {
    return NextResponse.json(
      { error: "Teacher not found" },
      { status: 404, headers: corsHeaders }
    )
  }

  // 3. Find the matching subject_class (the (class, subject) pair the teacher teaches)
  const sc = teacher.teacher_subject_allocation.find((a) => {
    if (subjectClassIdParam) {
      return String(a.subject_class.id) === subjectClassIdParam
    }
    return (
      String(a.subject_class.class_id) === classIdParam &&
      String(a.subject_class.subjects.id) === subjectIdParam
    )
  })

  if (!sc) {
    return NextResponse.json(
      { error: "You are not allocated to teach this class/subject" },
      { status: 403, headers: corsHeaders }
    )
  }
  // Note: we do NOT require "approved" status here — teacher can view
  // the report for any allocation they're assigned to, even pending/waiting.
  // Approval is only required for TAKING attendance.

  // 4. Get all students in the class (alphabetical for consistent numbering)
  const [students, sessions, absences] = await Promise.all([
    prisma.students.findMany({
      where: { class_id: sc.subject_class.class_id },
      select: { id: true, student_id: true, full_name: true },
      orderBy: { full_name: "asc" },
    }),
    prisma.attendance_sessions.findMany({
      where: { subject_class_id: sc.subject_class.id },
      select: {
        id: true,
        session_datetime: true,
        total_students: true,
        present_students: true,
        absent_students: true,
        attendance_percentage: true,
        notes: true,
      },
      orderBy: { session_datetime: "desc" },
    }),
    prisma.absences.findMany({
      where: { subject_class_id: sc.subject_class.id },
      select: {
        student_id: true,
        absence_date: true,
        excuse: true,
        attendance_session_id: true,
      },
      orderBy: { absence_date: "desc" },
    }),
  ])

  const totalStudents = students.length
  const totalSessions = sessions.length
  const lastSessionDate =
    sessions.length > 0 ? sessions[0].session_datetime.toISOString() : null

  // 5. Count absences per student and collect per-student absence details
  const absentCountByStudent = new Map<number, number>()
  const absentDetailsByStudent = new Map<
    number, { date: string; excuse: string }[]
  >()
  for (const a of absences) {
    absentCountByStudent.set(
      a.student_id,
      (absentCountByStudent.get(a.student_id) ?? 0) + 1
    )
    const list = absentDetailsByStudent.get(a.student_id) ?? []
    list.push({
      date:
        a.absence_date instanceof Date
          ? a.absence_date.toISOString().slice(0, 10)
          : String(a.absence_date).slice(0, 10),
      excuse: excuseLabel(a.excuse),
    })
    absentDetailsByStudent.set(a.student_id, list)
  }

  // 6. Build per-student breakdown
  const studentReports = students.map((s, index) => {
    const absentSessions = absentCountByStudent.get(s.id) ?? 0
    const presentSessions = totalSessions - absentSessions
    const pct =
      totalSessions > 0
        ? Math.round((presentSessions / totalSessions) * 10000) / 100
        : 0
    const neverAttended = totalSessions > 0 && absentSessions === totalSessions
    return {
      number: index + 1,
      student_id: s.student_id,
      full_name: s.full_name,
      absent_sessions: absentSessions,
      present_sessions: presentSessions,
      total_sessions: totalSessions,
      attendance_pct: pct,
      never_attended: neverAttended,
      absent_dates: absentDetailsByStudent.get(s.id) ?? [],
    }
  })

  // 7. Aggregate class-level numbers
  const totalAbsentCount = studentReports.reduce(
    (sum, s) => sum + s.absent_sessions,
    0
  )
  const totalPresentCount = totalSessions * totalStudents - totalAbsentCount
  const classAttendanceRate =
    totalSessions > 0 && totalStudents > 0
      ? Math.round((totalPresentCount / (totalSessions * totalStudents)) * 10000) /
        100
      : 0
  const neverAttendedCount = studentReports.filter((s) => s.never_attended).length

  // Debug dump of one student's absent_dates (dev only) - removed after debugging
  return NextResponse.json(
    {
      class_id: sc.subject_class.classes.id,
      class_name: sc.subject_class.classes.class_name,
      department_name: sc.subject_class.classes.departments.department_name,
      subject_id: sc.subject_class.subjects.id,
      subject_name: sc.subject_class.subjects.subject_name,
      subject_class_id: sc.subject_class.id,
      total_sessions: totalSessions,
      total_students: totalStudents,
      total_absent_count: totalAbsentCount,
      class_attendance_rate: classAttendanceRate,
      never_attended_count: neverAttendedCount,
      last_session_date: lastSessionDate,
      sessions: sessions.map((s) => ({
        session_id: s.id,
        session_datetime: s.session_datetime.toISOString(),
        total_students: s.total_students,
        present_students: s.present_students,
        absent_students: s.absent_students,
        attendance_percentage: s.attendance_percentage
          ? Number(s.attendance_percentage)
          : 0,
        notes: s.notes,
      })),
      students: studentReports,
    },
    { status: 200, headers: corsHeaders }
  )
}
