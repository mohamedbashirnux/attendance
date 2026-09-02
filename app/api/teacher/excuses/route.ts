import { NextRequest, NextResponse } from "next/server"
import { verifyTeacherToken, corsHeaders } from "@/lib/teacher-api/auth"

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders })
}

// Same values as the `absences.excuse` column enum in MySQL.
// If you change the enum in the DB, update this list too.
const EXCUSES = [
  "Family Emergency",
  "Medical Appointment",
  "Personal Reason",
  "Official Duty",
  "Other",
  "No Excuse",
]

/**
 * GET /api/teacher/excuses
 *
 * Returns the list of valid excuse values for the `absences` table.
 * The mobile app calls this to populate the excuse dropdown without
 * hardcoding the values.
 */
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

  return NextResponse.json(
    { excuses: EXCUSES },
    { status: 200, headers: corsHeaders }
  )
}
