import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { verifyStudentToken, corsHeaders } from "@/lib/student-api/auth"

// Same excuse-label map as the teacher report. Prisma returns the TS
// enum form on a typed select ("Family_Emergency"); we expose the
// spaced form ("Family Emergency") to keep mobile-friendly strings
// consistent across both the teacher and student apps.
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

  const studentDbId = await verifyStudentToken(token)
  if (!studentDbId) {
    return NextResponse.json(
      { error: "Invalid or expired token" },
      { status: 401, headers: corsHeaders }
    )
  }

  // 1. Find the student
  const student = await prisma.students.findUnique({
    where: { id: studentDbId },
    select: {
      id: true,
      student_id: true,
      full_name: true,
      class_id: true,
    },
  })
  if (!student) {
    return NextResponse.json(
      { error: "Student not found" },
      { status: 404, headers: corsHeaders }
    )
  }

  // 2. Find all subject_class rows for the student's class. We need
  //    this so we can scope absences: a student's absences are linked
  //    to a subject_class, not a class directly.
  const subjectClasses = await prisma.subject_class.findMany({
    where: { class_id: student.class_id },
    select: {
      id: true,
      subjects: { select: { id: true, subject_name: true } },
    },
  })
  const subjectClassIds = subjectClasses.map((s) => s.id)
  const subjectClassById = new Map(subjectClasses.map((s) => [s.id, s]))

  // 3. Get all attendance sessions for those subject_classes, plus
  //    the student's absences (with the excuse).
  const [sessions, absences] = await Promise.all([
    prisma.attendance_sessions.findMany({
      where: { subject_class_id: { in: subjectClassIds } },
      select: {
        id: true,
        subject_class_id: true,
        session_datetime: true,
        total_students: true,
        present_students: true,
        absent_students: true,
        attendance_percentage: true,
        notes: true,
        teachers: { select: { id: true, full_name: true, teacher_id: true } },
      },
      orderBy: { session_datetime: "desc" },
    }),
    prisma.absences.findMany({
      where: {
        student_id: student.id,
        subject_class_id: { in: subjectClassIds },
      },
      select: {
        id: true,
        subject_class_id: true,
        attendance_session_id: true,
        absence_date: true,
        excuse: true,
        created_at: true,
      },
      orderBy: { absence_date: "desc" },
    }),
  ])

  // 4. Build a set of session_ids the student was absent from, and
  //    a map from session_id -> excuse.
  const absentBySession = new Map<
    number,
    { excuse: string; date: string; createdAt: string | null }
  >()
  for (const a of absences) {
    absentBySession.set(a.attendance_session_id, {
      excuse: excuseLabel(a.excuse),
      date:
        a.absence_date instanceof Date
          ? a.absence_date.toISOString().slice(0, 10)
          : String(a.absence_date).slice(0, 10),
      createdAt:
        a.created_at instanceof Date
          ? a.created_at.toISOString()
          : a.created_at
            ? String(a.created_at)
            : null,
    })
  }

  // 5. Build per-subject breakdown AND a flat per-session list.
  const totalSessions = sessions.length
  const totalAbsent = absentBySession.size
  const totalPresent = totalSessions - totalAbsent
  const attendancePct =
    totalSessions > 0
      ? Math.round((totalPresent / totalSessions) * 10000) / 100
      : 0

  // Per-subject counts
  const subjectBreakdownMap = new Map<
    number,
    {
      subject_id: number
      subject_name: string
      total_sessions: number
      absent_sessions: number
      present_sessions: number
      attendance_pct: number
    }
  >()
  for (const sc of subjectClasses) {
    subjectBreakdownMap.set(sc.id, {
      subject_id: sc.subjects.id,
      subject_name: sc.subjects.subject_name,
      total_sessions: 0,
      absent_sessions: 0,
      present_sessions: 0,
      attendance_pct: 0,
    })
  }
  for (const s of sessions) {
    const b = subjectBreakdownMap.get(s.subject_class_id)
    if (!b) continue
    b.total_sessions += 1
    if (absentBySession.has(s.id)) {
      b.absent_sessions += 1
    } else {
      b.present_sessions += 1
    }
  }
  for (const b of subjectBreakdownMap.values()) {
    b.attendance_pct =
      b.total_sessions > 0
        ? Math.round((b.present_sessions / b.total_sessions) * 10000) / 100
        : 0
  }

  // Per-session list (newest first)
  const sessionList = sessions.map((s) => {
    const sc = subjectClassById.get(s.subject_class_id)
    const abs = absentBySession.get(s.id)
    return {
      session_id: s.id,
      subject_id: sc?.subjects.id ?? null,
      subject_name: sc?.subjects.subject_name ?? null,
      session_datetime: s.session_datetime.toISOString(),
      was_absent: !!abs,
      excuse: abs ? abs.excuse : null,
      absence_date: abs ? abs.date : null,
      // The exact moment the teacher recorded this absence (server
      // timestamp, not class time). Lets the student see when the
      // teacher actually marked them absent.
      absence_created_at: abs ? abs.createdAt : null,
      notes: s.notes,
      teacher_id: s.teachers?.id ?? null,
      teacher_code: s.teachers?.teacher_id ?? null,
      teacher_name: s.teachers?.full_name ?? null,
    }
  })

  return NextResponse.json(
    {
      student_id: student.student_id,
      full_name: student.full_name,
      class_id: student.class_id,
      total_sessions: totalSessions,
      total_absent: totalAbsent,
      total_present: totalPresent,
      attendance_pct: attendancePct,
      subjects: Array.from(subjectBreakdownMap.values()),
      sessions: sessionList,
    },
    { status: 200, headers: corsHeaders }
  )
}
