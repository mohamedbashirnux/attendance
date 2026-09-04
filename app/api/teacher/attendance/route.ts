import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { verifyTeacherToken, corsHeaders } from "@/lib/teacher-api/auth"
import { computeLiveStatus } from "@/lib/backend_faculty_user/teacher_subject_allocation/set-status"
import { toTimeString } from "@/lib/backend_faculty_user/teacher_subject_allocation/time"

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders })
}

type Body = {
  subject_class_id?: number
  class_id?: number
  subject_id?: number
  session_datetime?: string
  // Legacy: just a list of student ids, all stored with excuse = "No_Excuse".
  absent_student_ids?: (number | string)[]
  // Preferred: each absent entry can carry an excuse reason. The value
  // must match one of the `absences_excuse` enum members in the DB:
  //   "Family Emergency", "Medical Appointment", "Personal Reason",
  //   "Official Duty", "Other", "No Excuse"
  // Anything else is rejected by the DB enum, the transaction rolls
  // back, and the response is 500 "Could not save attendance".
  absences?: { student_id: number | string; excuse?: string }[]
  notes?: string
}

// The mobile sends the human-readable excuse ("Family Emergency").
// Prisma's TS enum members don't allow spaces, so it expects the
// underscored form ("Family_Emergency"). The DB column stores the
// spaced form (the @map target), so the round-trip is:
//   mobile -> "Family Emergency"
//   route  -> "Family_Emergency" (Prisma accepts)
//   DB     -> "Family Emergency" (stored as-is via @map)
function toExcuseEnum(v: string | null | undefined): string {
  if (!v) return "No_Excuse"
  return v.replace(/ /g, "_")
}

export async function POST(req: NextRequest) {
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

  let body: Body
  try {
    body = (await req.json()) as Body
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400, headers: corsHeaders }
    )
  }

  // 1. Find the teacher
  const teacher = await prisma.teachers.findUnique({
    where: { teacher_id: teacherId },
    include: {
      teacher_subject_allocation: {
        select: {
          id: true,
          subject_class_id: true,
          status: true,
          start_time: true,
          end_time: true,
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

  // 2. Resolve subject_class_id from either direct id or (class_id + subject_id)
  let subjectClassId = Number(body.subject_class_id)
  if (!Number.isInteger(subjectClassId) || subjectClassId <= 0) {
    const classId = Number(body.class_id)
    const subjectId = Number(body.subject_id)
    if (!Number.isInteger(classId) || !Number.isInteger(subjectId)) {
      return NextResponse.json(
        { error: "subject_class_id is required (or class_id + subject_id)" },
        { status: 400, headers: corsHeaders }
      )
    }
    const sc = await prisma.subject_class.findFirst({
      where: { class_id: classId, subject_id: subjectId },
      select: { id: true },
    })
    if (!sc) {
      return NextResponse.json(
        { error: "This subject is not assigned to the selected class" },
        { status: 400, headers: corsHeaders }
      )
    }
    subjectClassId = sc.id
  }

  // 3. Verify the teacher is allocated to this subject_class AND the live
  //    status is "approved" (dean allowed + currently inside the time
  //    window, OR stored as approved and still inside the window).
  const allocation = teacher.teacher_subject_allocation.find(
    (a) => a.subject_class_id === subjectClassId
  )
  if (!allocation) {
    return NextResponse.json(
      { error: "You are not allocated to teach this class/subject" },
      { status: 403, headers: corsHeaders }
    )
  }
  const liveStatus = computeLiveStatus(
    allocation.status,
    toTimeString(allocation.start_time),
    toTimeString(allocation.end_time)
  )
  if (liveStatus !== "approved") {
    // If the live status is "pending" and there is already a session for
    // this subject_class today, the teacher submitted attendance and the
    // allocation was reset to "pending" to lock out a second submission
    // for the same session. Tell them clearly instead of returning the
    // generic "not approved" message.
    if (allocation.status === "pending") {
      const now = new Date()
      const dayStart = new Date(
        Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())
      )
      const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000)
      const existingToday = await prisma.attendance_sessions.findFirst({
        where: {
          subject_class_id: subjectClassId,
          session_datetime: { gte: dayStart, lt: dayEnd },
        },
        select: { id: true, session_datetime: true },
      })
      if (existingToday) {
        return NextResponse.json(
          {
            error: `You already submitted attendance for this class today (session id ${existingToday.id} at ${existingToday.session_datetime.toISOString()}). The class is now locked. Please ask the faculty user to re-allow it if a second session is needed.`,
            already_submitted: true,
            session_id: existingToday.id,
            session_datetime: existingToday.session_datetime.toISOString(),
          },
          { status: 409, headers: corsHeaders }
        )
      }
    }
    return NextResponse.json(
      {
        error: `This allocation is not approved right now (current status: ${allocation.status}, live: ${liveStatus}). You can only take attendance when the class is approved and inside its time window.`,
      },
      { status: 403, headers: corsHeaders }
    )
  }

  // 4. Get total students in this class (so we can compute present/absent counts)
  const subjectClass = await prisma.subject_class.findUnique({
    where: { id: subjectClassId },
    select: { class_id: true },
  })
  if (!subjectClass) {
    return NextResponse.json(
      { error: "Subject class not found" },
      { status: 404, headers: corsHeaders }
    )
  }
  const totalStudents = await prisma.students.count({
    where: { class_id: subjectClass.class_id },
  })

  // 5. Parse the absent list. Two shapes are accepted:
  //    - body.absences: [{ student_id, excuse }] (preferred; excuse stored)
  //    - body.absent_student_ids: [...] (legacy; excuse defaults to No_Excuse)
  // Duplicates are removed by student_id, keeping the first occurrence.
  type AbsentEntry = { student_id: number; excuse: string | null }
  const absentEntries: AbsentEntry[] = []
  const seen = new Set<number>()

  if (Array.isArray(body.absences)) {
    for (const a of body.absences) {
      const sid = Number(a?.student_id)
      if (!Number.isInteger(sid) || sid <= 0) continue
      if (seen.has(sid)) continue
      seen.add(sid)
      const excuse = typeof a?.excuse === "string" && a.excuse.length > 0 ? a.excuse : null
      absentEntries.push({ student_id: sid, excuse })
    }
  } else if (Array.isArray(body.absent_student_ids)) {
    for (const v of body.absent_student_ids) {
      const sid = Number(v)
      if (!Number.isInteger(sid) || sid <= 0) continue
      if (seen.has(sid)) continue
      seen.add(sid)
      absentEntries.push({ student_id: sid, excuse: null })
    }
  }

  const absentIds = absentEntries.map((e) => e.student_id)
  const absentCount = absentIds.length
  const presentCount = totalStudents - absentCount

  if (presentCount < 0) {
    return NextResponse.json(
      { error: "Absent list has more students than the class has" },
      { status: 400, headers: corsHeaders }
    )
  }

  // 6. Verify each absent student actually belongs to this class
  if (absentIds.length > 0) {
    const valid = await prisma.students.findMany({
      where: { id: { in: absentIds }, class_id: subjectClass.class_id },
      select: { id: true },
    })
    const validIds = new Set(valid.map((s) => s.id))
    const invalid = absentIds.filter((id) => !validIds.has(id))
    if (invalid.length > 0) {
      return NextResponse.json(
        {
          error: `These student ids are not in the class: ${invalid.join(", ")}`,
        },
        { status: 400, headers: corsHeaders }
      )
    }
  }

  // 7. Parse the session date (default to NOW)
  let sessionDate: Date
  if (body.session_datetime) {
    const d = new Date(body.session_datetime)
    if (isNaN(d.getTime())) {
      return NextResponse.json(
        { error: "Invalid session_datetime" },
        { status: 400, headers: corsHeaders }
      )
    }
    sessionDate = d
  } else {
    sessionDate = new Date()
  }

  // 8. Create the attendance_session + absences in a transaction
  const attendancePct =
    totalStudents > 0
      ? Math.round((presentCount / totalStudents) * 10000) / 100
      : 0

  const absenceDateOnly = new Date(
    Date.UTC(
      sessionDate.getFullYear(),
      sessionDate.getMonth(),
      sessionDate.getDate()
    )
  )

  try {
    const result = await prisma.$transaction(async (tx) => {
      const session = await tx.attendance_sessions.create({
        data: {
          subject_class_id: subjectClassId,
          teacher_id: teacher.id,
          session_datetime: sessionDate,
          total_students: totalStudents,
          absent_students: absentCount,
          present_students: presentCount,
          attendance_percentage: attendancePct,
          notes: body.notes ?? null,
        },
      })

      if (absentEntries.length > 0) {
        await tx.absences.createMany({
          data: absentEntries.map((e) => ({
            student_id: e.student_id,
            subject_class_id: subjectClassId,
            attendance_session_id: session.id,
            absence_date: absenceDateOnly,
            // excuse: convert the spaced form ("Family Emergency") to
            // the Prisma TS enum form ("Family_Emergency"). Prisma
            // writes it back to the DB column as the spaced string
            // via @map. Fall back to "No_Excuse" when none given.
            excuse: toExcuseEnum(e.excuse) as any,
          })),
        })
      }

      // Lock the allocation back to "pending" so the teacher cannot
      // submit a second attendance for the same session. The dean must
      // re-allow (pending -> waiting -> approved) for the next session.
      await tx.teacher_subject_allocation.update({
        where: { id: allocation.id },
        data: { status: "pending" },
      })

      return session
    })

    return NextResponse.json(
      {
        success: true,
        message: `Attendance recorded. ${presentCount} present, ${absentCount} absent.`,
        session_id: result.id,
        session_datetime: result.session_datetime.toISOString(),
        total_students: totalStudents,
        present_students: presentCount,
        absent_students: absentCount,
        attendance_percentage: attendancePct,
        absent_count_saved: absentIds.length,
      },
      { status: 201, headers: corsHeaders }
    )
  } catch (err: any) {
    // Unique constraint hit means same student was already absent in this session
    if (err?.code === "P2002") {
      return NextResponse.json(
        { error: "Duplicate absence entry for a student" },
        { status: 409, headers: corsHeaders }
      )
    }
    console.error("attendance create error:", err)
    return NextResponse.json(
      { error: "Could not save attendance" },
      { status: 500, headers: corsHeaders }
    )
  }
}
