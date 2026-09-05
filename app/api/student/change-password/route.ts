import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"
import { verifyStudentToken, corsHeaders } from "@/lib/student-api/auth"

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders })
}

const changePasswordSchema = z
  .object({
    // We require the current password to make sure a stolen token
    // alone cannot change the password. If the caller does not have
    // the current password they have to ask the faculty to reset it
    // (use the existing student-management page).
    current_password: z.string().min(1, "current_password is required"),
    new_password: z
      .string()
      .min(8, "New password must be at least 8 characters")
      .max(255, "New password is too long"),
  })
  .refine((d) => d.current_password !== d.new_password, {
    message: "New password must be different from the current one",
    path: ["new_password"],
  })

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization")
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null
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

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400, headers: corsHeaders }
    )
  }

  const parsed = changePasswordSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400, headers: corsHeaders }
    )
  }

  const student = await prisma.students.findUnique({
    where: { id: studentDbId },
    select: { id: true, student_id: true, password: true },
  })
  if (!student) {
    return NextResponse.json(
      { error: "Student not found" },
      { status: 404, headers: corsHeaders }
    )
  }

  // Verify the current password before letting them change it.
  const currentOk = await bcrypt.compare(
    parsed.data.current_password,
    student.password
  )
  if (!currentOk) {
    return NextResponse.json(
      { error: "Current password is incorrect" },
      { status: 401, headers: corsHeaders }
    )
  }

  const hashed = await bcrypt.hash(parsed.data.new_password, 10)

  try {
    await prisma.students.update({
      where: { id: student.id },
      data: { password: hashed },
    })
  } catch (e) {
    console.error("change-password update failed", e)
    return NextResponse.json(
      { error: "Could not change password" },
      { status: 500, headers: corsHeaders }
    )
  }

  return NextResponse.json(
    {
      ok: true,
      student_id: student.student_id,
      message:
        "Password updated. You will stay signed in on this device; other devices will need to log in again.",
    },
    { status: 200, headers: corsHeaders }
  )
}
