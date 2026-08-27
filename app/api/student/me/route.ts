import { NextRequest, NextResponse } from "next/server"
import { verifyStudentToken, getStudentProfile, corsHeaders } from "@/lib/student-api/auth"

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

  const studentId = await verifyStudentToken(token)
  if (!studentId) {
    return NextResponse.json(
      { error: "Invalid or expired token" },
      { status: 401, headers: corsHeaders }
    )
  }

  const profile = await getStudentProfile(studentId)
  if (!profile) {
    return NextResponse.json(
      { error: "Student not found" },
      { status: 404, headers: corsHeaders }
    )
  }

  return NextResponse.json(
    { student: profile },
    { status: 200, headers: corsHeaders }
  )
}
