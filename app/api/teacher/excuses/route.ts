import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { verifyTeacherToken, corsHeaders } from "@/lib/teacher-api/auth"

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders })
}

/**
 * GET /api/teacher/excuses
 *
 * Returns the list of valid excuse values for the `absences` table.
 * The mobile app calls this once at startup (or when the excuse
 * dropdown is first opened) to populate the dropdown without
 * hardcoding the values. The list is read from the Prisma client's
 * enum, so it always matches the DB schema.
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

  // Prisma's generated client exposes each enum as a frozen object
  // keyed by the TS member name (e.g. "Medical_Appointment"). The
  // values are the DB-mapped strings (e.g. "Medical Appointment").
  const excuseEnum = (prisma as any).absences_excuse as Record<string, string> | undefined
  if (!excuseEnum) {
    return NextResponse.json(
      { error: "Excuse enum not available" },
      { status: 500, headers: corsHeaders }
    )
  }

  // Keep the order user-friendly: leave "No Excuse" at the bottom so
  // the default isn't the first thing the teacher sees.
  const ordered = [
    "Family Emergency",
    "Medical Appointment",
    "Personal Reason",
    "Official Duty",
    "Other",
    "No Excuse",
  ]
  const values = ordered.filter((v) => Object.values(excuseEnum).includes(v))

  return NextResponse.json(
    { excuses: values },
    { status: 200, headers: corsHeaders }
  )
}
