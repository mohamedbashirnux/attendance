import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import {
  labelFor,
  studyModeOptions,
  semesterOptions,
} from "@/lib/backend_faculty_user/class/enums"
import { verifyTeacherToken, corsHeaders } from "@/lib/teacher-api/auth"

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders })
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ classId: string }> }
) {
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

  const { classId } = await params
  const classIdNum = Number(classId)
  if (!classIdNum) {
    return NextResponse.json(
      { error: "Invalid class id" },
      { status: 400, headers: corsHeaders }
    )
  }

  const teacher = await prisma.teachers.findUnique({
    where: { teacher_id: teacherId },
    include: {
      teacher_subject_allocation: {
        include: { subject_class: true },
      },
    },
  })
  if (!teacher) {
    return NextResponse.json(
      { error: "Teacher not found" },
      { status: 404, headers: corsHeaders }
    )
  }

  const isAssigned = teacher.teacher_subject_allocation.some(
    (a) => a.subject_class.class_id === classIdNum
  )
  if (!isAssigned) {
    return NextResponse.json(
      { error: "You are not assigned to this class" },
      { status: 403, headers: corsHeaders }
    )
  }

  const cls = await prisma.classes.findUnique({
    where: { id: classIdNum },
    include: { departments: { include: { faculty: true } } },
  })
  if (!cls) {
    return NextResponse.json(
      { error: "Class not found" },
      { status: 404, headers: corsHeaders }
    )
  }

  const students = await prisma.students.findMany({
    where: { class_id: classIdNum },
    select: {
      student_id: true,
      full_name: true,
      phone: true,
      status: true,
      created_at: true,
    },
    orderBy: { id: "asc" },
  })

  return NextResponse.json(
    {
      class: {
        id: cls.id,
        class_name: cls.class_name,
        department_name: cls.departments.department_name,
        faculty_name: cls.departments.faculty.faculty_name,
        study_mode: cls.study_mode,
        study_mode_label: labelFor(studyModeOptions, cls.study_mode),
        semester: cls.semester,
        semester_label: labelFor(semesterOptions, cls.semester),
        academic_year: cls.academic_year,
      },
      students: students.map((s) => ({
        student_id: s.student_id,
        full_name: s.full_name,
        phone: s.phone,
        status: s.status,
        created_at: s.created_at.toISOString(),
      })),
    },
    { status: 200, headers: corsHeaders }
  )
}
