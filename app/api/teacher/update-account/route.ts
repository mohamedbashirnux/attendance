import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import { z } from "zod"
import { verifyTeacherToken, corsHeaders } from "@/lib/teacher-api/auth"

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders })
}

const passwordSchema = z
  .string()
  .min(5, "Password must be at least 5 characters")
  .max(128, "Password is too long")

const bodySchema = z.object({
  current_password: z.string().min(1, "Current password is required"),
  new_password: passwordSchema.optional(),
  new_username: z.string().trim().min(3, "Username must be at least 3 characters").max(100).optional(),
}).refine(
  (data) => data.new_password !== undefined || data.new_username !== undefined,
  { message: "Provide new_password or new_username", path: ["new_password"] }
)

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
    select: { password: true, username: true },
  })
  if (!teacher) {
    return NextResponse.json(
      { error: "Teacher not found" },
      { status: 404, headers: corsHeaders }
    )
  }

  let currentValid = false
  try {
    currentValid = await bcrypt.compare(parsed.data.current_password, teacher.password)
  } catch {
    currentValid = parsed.data.current_password === teacher.password
  }
  if (!currentValid) {
    return NextResponse.json(
      { error: "Current password is incorrect" },
      { status: 401, headers: corsHeaders }
    )
  }

  const updateData: { password?: string; username?: string; updated_at: Date } = {
    updated_at: new Date(),
  }

  if (parsed.data.new_password !== undefined) {
    if (parsed.data.current_password === parsed.data.new_password) {
      return NextResponse.json(
        { error: "New password must be different from current password" },
        { status: 400, headers: corsHeaders }
      )
    }
    updateData.password = await bcrypt.hash(parsed.data.new_password, 10)
  }

  if (parsed.data.new_username !== undefined) {
    if (parsed.data.new_username === teacher.username) {
      return NextResponse.json(
        { error: "New username must be different from current username" },
        { status: 400, headers: corsHeaders }
      )
    }
    const existing = await prisma.teachers.findUnique({
      where: { username: parsed.data.new_username },
      select: { teacher_id: true },
    })
    if (existing && existing.teacher_id !== teacherId) {
      return NextResponse.json(
        { error: "Username is already taken" },
        { status: 409, headers: corsHeaders }
      )
    }
    updateData.username = parsed.data.new_username
  }

  await prisma.teachers.update({
    where: { teacher_id: teacherId },
    data: updateData,
  })

  return NextResponse.json(
    { message: "Account updated successfully" },
    { status: 200, headers: corsHeaders }
  )
}
