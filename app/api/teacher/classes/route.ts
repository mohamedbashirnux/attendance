import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { verifyTeacherToken, corsHeaders } from "@/lib/teacher-api/auth"
import {
  studyModeOptions,
  semesterOptions,
  labelFor,
} from "@/lib/backend_faculty_user/class/enums"

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

  const teacher = await prisma.teachers.findUnique({
    where: { teacher_id: teacherId },
    include: {
      teacher_subject_allocation: {
        include: {
          subject_class: {
            include: {
              classes: {
                include: { departments: { include: { faculty: true } } },
              },
              subjects: true,
            },
          },
        },
        orderBy: { id: "asc" },
      },
    },
  })

  if (!teacher) {
    return NextResponse.json(
      { error: "Teacher not found" },
      { status: 404, headers: corsHeaders }
    )
  }

  const classes = teacher.teacher_subject_allocation.map((a) => ({
    allocation_id: a.id,
    subject_class_id: a.subject_class_id,
    class_id: a.subject_class.classes.id,
    class_name: a.subject_class.classes.class_name,
    department_name: a.subject_class.classes.departments.department_name,
    faculty_name: a.subject_class.classes.departments.faculty.faculty_name,
    study_mode: labelFor(studyModeOptions, a.subject_class.classes.study_mode),
    semester: labelFor(semesterOptions, a.subject_class.classes.semester),
    academic_year: a.subject_class.classes.academic_year,
    subject_id: a.subject_class.subjects.id,
    subject_name: a.subject_class.subjects.subject_name,
    start_time: a.start_time.toISOString().slice(11, 19),
    end_time: a.end_time.toISOString().slice(11, 19),
    status: a.status,
  }))

  return NextResponse.json(
    {
      teacher_id: teacher.teacher_id,
      full_name: teacher.full_name,
      count: classes.length,
      classes,
    },
    { status: 200, headers: corsHeaders }
  )
}
