import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"
import { signStudentToken, corsHeaders } from "@/lib/student-api/auth"

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders })
}

const loginSchema = z.object({
  // The human-readable student id, e.g. "S001". Not the DB primary key.
  student_id: z.string().min(1, "student_id is required"),
  password: z.string().min(1, "password is required"),
})

export async function POST(req: NextRequest) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400, headers: corsHeaders }
    )
  }

  const parsed = loginSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400, headers: corsHeaders }
    )
  }

  const { student_id, password } = parsed.data

  // Find the student by their human-readable student_id (e.g. "S001").
  // We pull the class + class.department + class.department.faculty
  // in one query so the mobile can show "Faculty → Department → Class"
  // after login.
  const student = await prisma.students.findUnique({
    where: { student_id },
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
      { error: "Invalid student id or password" },
      { status: 401, headers: corsHeaders }
    )
  }

  const valid = await bcrypt.compare(password, student.password)
  if (!valid) {
    return NextResponse.json(
      { error: "Invalid student id or password" },
      { status: 401, headers: corsHeaders }
    )
  }

  // Block pending students from logging in. The faculty user must
  // approve them first via /faculty_user/student.
  if (student.status !== "approved") {
    return NextResponse.json(
      {
        error:
          "Your account is pending approval. Please contact your faculty to approve your account before logging in.",
        status: student.status ?? "pending",
      },
      { status: 403, headers: corsHeaders }
    )
  }

  // Token carries the DB primary key (students.id), not the human
  // student_id string. All other student endpoints look the student
  // up by DB id.
  const token = await signStudentToken(student.id)

  return NextResponse.json(
    {
      token,
      student: {
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
    },
    { status: 200, headers: corsHeaders }
  )
}
