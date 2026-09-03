import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { verifyStudentToken, corsHeaders } from "@/lib/student-api/auth"

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

  const student = await prisma.students.findUnique({
    where: { id: studentDbId },
    include: {
      classes: {
        include: {
          departments: {
            include: { faculty: true },
          },
        },
      },
    },
  })

  if (!student) {
    return NextResponse.json(
      { error: "Student not found" },
      { status: 404, headers: corsHeaders }
    )
  }

  return NextResponse.json(
    {
      id: student.id,
      student_id: student.student_id,
      full_name: student.full_name,
      phone: student.phone,
      status: student.status,
      class_id: student.class_id,
      class_name: student.classes?.class_name ?? null,
      department_id: student.classes?.departments?.id ?? null,
      department_name: student.classes?.departments?.department_name ?? null,
      faculty_id: student.classes?.departments?.faculty?.id ?? null,
      faculty_name: student.classes?.departments?.faculty?.faculty_name ?? null,
    },
    { status: 200, headers: corsHeaders }
  )
}
