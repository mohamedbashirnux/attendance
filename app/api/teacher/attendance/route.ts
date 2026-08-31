import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { verifyTeacherToken, corsHeaders } from "@/lib/teacher-api/auth"

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders })
}

type Body = {
  subject_class_id?: number
  class_id?: number
  subject_id?: number
  session_datetime?: string
  absent_student_ids?: (number | string)[]
  notes?: string
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
        select: { subject_class_id: true, status: true },
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

  // 3. Verify the teacher is allocated to this subject_class AND it's approved
  const allocation = teacher.teacher_subject_allocation.find(
    (a) => a.subject_class_id === subjectClassId
  )
  if (!allocation) {
    return NextResponse.json(
      { error: "You are not allocated to teach this class/subject" },
      { status: 403, headers: corsHeaders }
    )
  }
  if (allocation.status !== "approved") {
    return NextResponse.json(
      {
        error: `This allocation is not approved yet (current status: ${allocation.status}). You can only take attendance for approved classes.`,
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

  // 5. Parse the absent list (deduped)
  const absentIds = Array.isArray(body.absent_student_ids)
    ? [
        ...new Set(
          body.absent_student_ids
            .map((v) => Number(v))
            .filter((n) => Number.isInteger(n) && n > 0)
        ),
      ]
    : []
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

      if (absentIds.length > 0) {
        await tx.absences.createMany({
          data: absentIds.map((studentId) => ({
            student_id: studentId,
            subject_class_id: subjectClassId,
            attendance_session_id: session.id,
            absence_date: absenceDateOnly,
          })),
        })
      }

      return session
    })

    return NextResponse.json(
      {
        success: true,
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
