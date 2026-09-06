import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { verifyStudentToken, corsHeaders } from "@/lib/student-api/auth"

// MySQL stores the time columns as Time(0) and returns them as
// strings ("HH:MM:SS"). Trim to "HH:MM" so the mobile app can show
// "08:00" instead of "08:00:00".
function shortTime(t: unknown): string {
  if (typeof t !== "string") return ""
  return t.length >= 5 ? t.slice(0, 5) : t
}

// The live DB has no class_id / time_start / time_end on the timetable
// table (the repo prisma schema is stale on this). We use raw SQL so
// the query stays valid against the actual columns, and join times in
// from teacher_subject_allocation.
//
// One row per timetable entry, joined with subject + teacher + class
// + class.department for the mobile app header.
type RawRow = {
  timetable_id: number
  allocation_id: number
  day_of_week: string
  location_hall: string | null
  subject_id: number
  subject_name: string
  teacher_id: number
  teacher_code: string
  teacher_name: string
  class_id: number
  class_name: string
  department_id: number
  department_name: string
  faculty_id: number
  faculty_name: string
  start_time: string
  end_time: string
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders })
}

export async function GET(req: NextRequest) {
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

  // Find the student (we need their class_id).
  const student = await prisma.students.findUnique({
    where: { id: studentDbId },
    select: {
      id: true,
      student_id: true,
      full_name: true,
      class_id: true,
    },
  })
  if (!student) {
    return NextResponse.json(
      { error: "Student not found" },
      { status: 404, headers: corsHeaders }
    )
  }

  // Pull timetable rows for the student's class. The query joins
  // through teacher_subject_allocation -> subject_class -> classes
  // and on to subjects / teachers / departments / faculty. We ORDER
  // by day_of_week in week order (Monday first) then by start_time
  // so the mobile can render a Monday->Sunday grid directly.
  const rows = await prisma.$queryRawUnsafe<RawRow[]>(
    `SELECT
       t.id            AS timetable_id,
       t.allocation_id AS allocation_id,
       t.day_of_week   AS day_of_week,
       t.location_hall AS location_hall,
       sc.subject_id   AS subject_id,
       s.subject_name  AS subject_name,
       tsa.teacher_id  AS teacher_id,
       tc.teacher_id   AS teacher_code,
       tc.full_name    AS teacher_name,
       c.id            AS class_id,
       c.class_name    AS class_name,
       d.id            AS department_id,
       d.department_name AS department_name,
       f.id            AS faculty_id,
       f.faculty_name  AS faculty_name,
       TIME_FORMAT(tsa.start_time, '%H:%i:%s') AS start_time,
       TIME_FORMAT(tsa.end_time,   '%H:%i:%s') AS end_time
     FROM timetable t
     JOIN teacher_subject_allocation tsa ON tsa.id = t.allocation_id
     JOIN teachers tc                    ON tc.id  = tsa.teacher_id
     JOIN subject_class sc               ON sc.id  = tsa.subject_class_id
     JOIN subjects s                     ON s.id   = sc.subject_id
     JOIN classes c                      ON c.id   = sc.class_id
     JOIN departments d                  ON d.id   = c.department_id
     JOIN faculty f                      ON f.id   = d.faculty_id
     WHERE sc.class_id = ?
     ORDER BY FIELD(t.day_of_week,
            'Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'),
            tsa.start_time ASC`,
    student.class_id
  )

  // Group by day for convenience — the mobile may want a flat list
  // OR a Monday..Sunday map; provide both.
  type Entry = {
    id: number
    allocation_id: number
    day_of_week: string
    time_start: string
    time_end: string
    location_hall: string | null
    subject_id: number
    subject_name: string
    teacher_id: number
    teacher_code: string
    teacher_name: string
    class_id: number
    class_name: string
    department_id: number
    department_name: string
    faculty_id: number
    faculty_name: string
  }
  const byDay: Record<string, Entry[]> = {
    Monday: [],
    Tuesday: [],
    Wednesday: [],
    Thursday: [],
    Friday: [],
    Saturday: [],
    Sunday: [],
  }

  // Normalize day_of_week to title case so the byDay map keys are
  // always "Monday".."Sunday" regardless of how the DB stores them
  // (e.g. "monday" / "Monday" / "MONDAY" all map to "Monday").
  function titleCase(s: string): string {
    if (!s) return s
    return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase()
  }

  const list: Entry[] = rows.map((r) => ({
    id: r.timetable_id,
    allocation_id: r.allocation_id,
    day_of_week: titleCase(r.day_of_week),
    time_start: shortTime(r.start_time),
    time_end: shortTime(r.end_time),
    location_hall: r.location_hall,
    subject_id: r.subject_id,
    subject_name: r.subject_name,
    teacher_id: r.teacher_id,
    teacher_code: r.teacher_code,
    teacher_name: r.teacher_name,
    class_id: r.class_id,
    class_name: r.class_name,
    department_id: r.department_id,
    department_name: r.department_name,
    faculty_id: r.faculty_id,
    faculty_name: r.faculty_name,
  }))
  for (const e of list) {
    if (byDay[e.day_of_week]) {
      byDay[e.day_of_week].push(e)
    }
  }

  return NextResponse.json(
    {
      student_id: student.student_id,
      full_name: student.full_name,
      class_id: student.class_id,
      class_name: list[0]?.class_name ?? null,
      department_id: list[0]?.department_id ?? null,
      department_name: list[0]?.department_name ?? null,
      faculty_id: list[0]?.faculty_id ?? null,
      faculty_name: list[0]?.faculty_name ?? null,
      total_entries: list.length,
      entries: list,
      by_day: byDay,
    },
    { status: 200, headers: corsHeaders }
  )
}
