import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"
import { signTeacherToken, corsHeaders } from "@/lib/teacher-api/auth"

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders })
}

const loginSchema = z.object({
  username: z.string().min(1, "username is required"),
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

  const { username, password } = parsed.data

  const teacher = await prisma.teachers.findUnique({
    where: { username },
    include: { faculty: true },
  })

  if (!teacher) {
    return NextResponse.json(
      { error: "Invalid username or password" },
      { status: 401, headers: corsHeaders }
    )
  }

  const valid = await bcrypt.compare(password, teacher.password)
  if (!valid) {
    return NextResponse.json(
      { error: "Invalid username or password" },
      { status: 401, headers: corsHeaders }
    )
  }

  const token = await signTeacherToken(teacher.teacher_id)

  return NextResponse.json(
    {
      token,
      teacher: {
        teacher_id: teacher.teacher_id,
        full_name: teacher.full_name,
        username: teacher.username,
        faculty_id: teacher.faculty_id,
        faculty_name: teacher.faculty.faculty_name,
      },
    },
    { status: 200, headers: corsHeaders }
  )
}
