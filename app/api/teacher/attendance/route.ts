import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { Prisma } from "@prisma/client"
import { z } from "zod"
import { verifyTeacherToken, corsHeaders } from "@/lib/teacher-api/auth"

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders })
}

const bodySchema = z.object({
  class_id: z.coerce.number().int().positive("class_id is required"),
  subject_class_id: z.coerce.number().int().positive("subject_class_id is required"),
  session_datetime: z
    .string()
    .min(1, "session_datetime is required")
    .refine((v) => !Number.isNaN(Date.parse(v)), "session_datetime must be a valid date"),
  absent_student_ids: z.array(z.string().min(1)).max(500),
  excuse: z
    .enum([
      "No_Excuse",
      "Family_Emergency",
      "Medical_Appointment",
      "Personal_Reason",
      "Official_Duty",
      "Other",
    ])
    .optional()
    .default("No_Excuse"),
  notes: z.string().max(1000).optional(),
})

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

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400, headers: corsHeaders }
    )
  }

  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400, headers: corsHeaders }
    )
  }

  const teacher = await prisma.teachers.findUnique({
    where: { teacher_id: teacherId },
    select: { id: true },
  })
  if (!teacher) {
    return NextResponse.json(
      { error: "Teacher not found" },
      { status: 404, headers: corsHeaders }
    )
  }

  const subjectClass = await prisma.subject_class.findUnique({
    where: { id: parsed.data.subject_class_id },
    select: { id: true, class_id: true },
  })
  if (!subjectClass) {
    return NextResponse.json(
      { error: "Subject class not found" },
      { status: 404, headers: corsHeaders }
    )
  }
  if (subjectClass.class_id !== parsed.data.class_id) {
    return NextResponse.json(
      { error: "subject_class_id does not belong to class_id" },
      { status: 400, headers: corsHeaders }
    )
  }

  const allocation = await prisma.teacher_subject_allocation.findFirst({
    where: {
      teacher_id: teacher.id,
      subject_class_id: subjectClass.id,
    },
    select: { status: true },
  })
  if (!allocation) {
    return NextResponse.json(
      { error: "You are not assigned to this subject class" },
      { status: 403, headers: corsHeaders }
    )
  }
  if (allocation.status !== "approved") {
    return NextResponse.json(
      {
        error: `Cannot take attendance: your allocation status is "${allocation.status}". Only approved allocations can take attendance.`,
      },
      { status: 403, headers: corsHeaders }
    )
  }

  const sessionDatetime = new Date(parsed.data.session_datetime)
  const excuse = parsed.data.excuse ?? "No_Excuse"

  const classStudents = await prisma.students.findMany({
    where: { class_id: parsed.data.class_id },
    select: { id: true, student_id: true },
  })
  const totalStudents = classStudents.length

  const studentIdToDbId = new Map(
    classStudents.map((s) => [s.student_id, s.id])
  )
  const absentDbIds: number[] = []
  for (const sid of parsed.data.absent_student_ids) {
    const dbId = studentIdToDbId.get(sid)
    if (dbId === undefined) {
      return NextResponse.json(
        { error: `Student ${sid} is not in this class` },
        { status: 400, headers: corsHeaders }
      )
    }
    absentDbIds.push(dbId)
  }

  const absentCount = absentDbIds.length
  const presentCount = Math.max(0, totalStudents - absentCount)
  const percentage =
    totalStudents > 0
      ? Math.round((presentCount / totalStudents) * 10000) / 100
      : 0

  try {
    await prisma.$transaction(async (tx) => {
      const session = await tx.attendance_sessions.create({
        data: {
          subject_class_id: parsed.data.subject_class_id,
          teacher_id: teacher.id,
          session_datetime: sessionDatetime,
          total_students: totalStudents,
          absent_students: absentCount,
          present_students: presentCount,
          attendance_percentage: new Prisma.Decimal(percentage),
          notes: parsed.data.notes ?? null,
        },
      })

      if (absentDbIds.length > 0) {
        await tx.absences.createMany({
          data: absentDbIds.map((studentDbId) => ({
            attendance_session_id: session.id,
            student_id: studentDbId,
            subject_class_id: parsed.data.subject_class_id,
            absence_date: sessionDatetime,
            excuse,
          })),
          skipDuplicates: true,
        })
      }

      return session
    })
  } catch {
    return NextResponse.json(
      { error: "Failed to save attendance" },
      { status: 500, headers: corsHeaders }
    )
  }

  return NextResponse.json(
    {
      message: "Attendance saved",
      summary: {
        class_id: parsed.data.class_id,
        subject_class_id: parsed.data.subject_class_id,
        session_datetime: sessionDatetime.toISOString(),
        total_students: totalStudents,
        present_students: presentCount,
        absent_students: absentCount,
        attendance_percentage: percentage,
      },
    },
    { status: 201, headers: corsHeaders }
  )
}
