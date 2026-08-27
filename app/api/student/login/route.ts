import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import { signStudentToken, getStudentProfile, corsHeaders } from "@/lib/student-api/auth"

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders })
}

export async function POST(req: NextRequest) {
  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400, headers: corsHeaders }
    )
  }

  const student_id =
    body?.student_id != null ? String(body.student_id) : ""
  const password = body?.password
  if (!student_id || !password) {
    return NextResponse.json(
      { error: "student_id and password are required" },
      { status: 400, headers: corsHeaders }
    )
  }

  const student = await prisma.students.findUnique({ where: { student_id } })
  if (!student) {
    return NextResponse.json(
      { error: "Invalid credentials" },
      { status: 401, headers: corsHeaders }
    )
  }

  let valid = false
  try {
    valid = await bcrypt.compare(password, student.password)
  } catch {
    valid = password === student.password
  }
  if (!valid) {
    return NextResponse.json(
      { error: "Invalid credentials" },
      { status: 401, headers: corsHeaders }
    )
  }

  if (student.status !== "approved") {
    return NextResponse.json(
      { error: "Account is not approved yet" },
      { status: 403, headers: corsHeaders }
    )
  }

  const token = await signStudentToken(student.student_id)
  const student_profile = await getStudentProfile(student.student_id)

  return NextResponse.json(
    { token, student: student_profile },
    { status: 200, headers: corsHeaders }
  )
}
