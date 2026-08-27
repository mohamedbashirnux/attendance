import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import { signTeacherToken, getTeacherProfile, corsHeaders } from "@/lib/teacher-api/auth"

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

  const username =
    body?.username != null ? String(body.username) : ""
  const password = body?.password
  if (!username || !password) {
    return NextResponse.json(
      { error: "username and password are required" },
      { status: 400, headers: corsHeaders }
    )
  }

  const teacher = await prisma.teachers.findUnique({ where: { username } })
  if (!teacher) {
    return NextResponse.json(
      { error: "Invalid credentials" },
      { status: 401, headers: corsHeaders }
    )
  }

  let valid = false
  try {
    valid = await bcrypt.compare(password, teacher.password)
  } catch {
    valid = password === teacher.password
  }
  if (!valid) {
    return NextResponse.json(
      { error: "Invalid credentials" },
      { status: 401, headers: corsHeaders }
    )
  }

  const token = await signTeacherToken(teacher.teacher_id)
  const teacher_profile = await getTeacherProfile(teacher.teacher_id)

  return NextResponse.json(
    { token, teacher: teacher_profile },
    { status: 200, headers: corsHeaders }
  )
}
