import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
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
  if (!Number.isInteger(classIdNum) || classIdNum <= 0) {
    return NextResponse.json(
      { error: "Invalid class id" },
      { status: 400, headers: corsHeaders }
    )
  }

  // 1. Find the teacher
  const teacher = await prisma.teachers.findUnique({
    where: { teacher_id: teacherId },
    include: {
      teacher_subject_allocation: {
        select: { subject_class: { select: { class_id: true } } },
      },
    },
  })

  if (!teacher) {
    return NextResponse.json(
      { error: "Teacher not found" },
      { status: 404, headers: corsHeaders }
    )
  }

  // 2. Check that this teacher is assigned to this class
  const isAssigned = teacher.teacher_subject_allocation.some(
    (a) => a.subject_class.class_id === classIdNum
  )
  if (!isAssigned) {
    return NextResponse.json(
      { error: "You are not assigned to this class" },
      { status: 403, headers: corsHeaders }
    )
  }

  // 3. Find the class info
  const cls = await prisma.classes.findUnique({
    where: { id: classIdNum },
    select: {
      id: true,
      class_name: true,
    },
  })
  if (!cls) {
    return NextResponse.json(
      { error: "Class not found" },
      { status: 404, headers: corsHeaders }
    )
  }

  // 4. Fetch only the students in this class — read only, id + name
  //    Sorted alphabetically by name so teacher/student see the same number
  const students = await prisma.students.findMany({
    where: { class_id: classIdNum },
    select: {
      student_id: true,
      full_name: true,
    },
    orderBy: { full_name: "asc" },
  })

  return NextResponse.json(
    {
      class_id: cls.id,
      class_name: cls.class_name,
      count: students.length,
      students,
    },
    { status: 200, headers: corsHeaders }
  )
}
