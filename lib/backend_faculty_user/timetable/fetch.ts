"use server"

import { prisma } from "@/lib/prisma"
import { toTimeString } from "@/lib/backend_faculty_user/teacher_subject_allocation/time"
import { auth } from "@/lib/backend_super_admin/auth/auth"

// The prisma/schema.prisma in the repo is stale and lists extra
// `class_id` / `time_start` / `time_end` columns on the `timetable`
// model that DO NOT EXIST in the live MySQL DB. We use raw SQL to
// read timetable rows so we only SELECT columns that actually exist
// on the live table.
//
// Live timetable columns:
//   id, allocation_id, day_of_week, location_hall, created_at, updated_at
//
// Day and times come from the related teacher_subject_allocation
// (which DOES have start_time / end_time) and the subject_class
// relation (which DOES have class_id).

export type TimetableRow = {
  id: number
  allocation_id: number
  day_of_week: string
  location_hall: string | null
  teacher_id: number
  teacher_code: string
  teacher_name: string
  subject_id: number
  subject_name: string
  class_id: number
  class_name: string
  time_start: string
  time_end: string
}

export type TimetableViewInfo = {
  department_name: string
  class_name: string
  study_mode: string | null
  semester: string | null
  allocations: {
    id: number
    teacher_id: number
    teacher_code: string
    teacher_name: string
    subject_id: number
    subject_name: string
    start_time: string
    end_time: string
  }[]
}

// Raw row shape returned by the SELECT below.
type RawTimetableRow = {
  id: number
  allocation_id: number
  day_of_week: string
  location_hall: string | null
  teacher_id: number
  teacher_code: string
  teacher_name: string
  subject_id: number
  subject_name: string
  class_id: number
  class_name: string
  start_time: Date
  end_time: Date
}

export async function getTimetableView(
  classId: number
): Promise<{ classInfo: TimetableViewInfo | null; entries: TimetableRow[] }> {
  const session = await auth()
  const facultyId = (session?.user as any)?.faculty_id as number | undefined
  if (!facultyId) return { classInfo: null, entries: [] }

  // Verify the class belongs to this faculty.
  const cls = await prisma.classes.findFirst({
    where: { id: classId, departments: { faculty_id: facultyId } },
    include: { departments: true },
  })
  if (!cls) return { classInfo: null, entries: [] }

  // Pull allocations via Prisma (the relation is in sync), and pull
  // timetable rows via raw SQL (so we don't trigger the stale class_id
  // column reference).
  const [allocations, rawRows] = await Promise.all([
    prisma.teacher_subject_allocation.findMany({
      where: { subject_class: { class_id: classId } },
      include: {
        teachers: true,
        subject_class: { include: { subjects: true } },
      },
      orderBy: { id: "asc" },
    }),
    prisma.$queryRawUnsafe<RawTimetableRow[]>(
      `SELECT
         t.id            AS id,
         t.allocation_id AS allocation_id,
         t.day_of_week   AS day_of_week,
         t.location_hall AS location_hall,
         tsa.teacher_id  AS teacher_id,
         tc.teacher_id   AS teacher_code,
         tc.full_name    AS teacher_name,
         sc.subject_id   AS subject_id,
         s.subject_name  AS subject_name,
         sc.class_id     AS class_id,
         c.class_name    AS class_name,
         tsa.start_time  AS start_time,
         tsa.end_time    AS end_time
       FROM timetable t
       JOIN teacher_subject_allocation tsa ON tsa.id = t.allocation_id
       JOIN teachers tc                    ON tc.id  = tsa.teacher_id
       JOIN subject_class sc               ON sc.id  = tsa.subject_class_id
       JOIN subjects s                     ON s.id   = sc.subject_id
       JOIN classes c                      ON c.id   = sc.class_id
       WHERE sc.class_id = ?
       ORDER BY FIELD(t.day_of_week,
              'Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'),
              tsa.start_time ASC`,
      classId
    ),
  ])

  return {
    classInfo: {
      department_name: cls.departments.department_name,
      class_name: cls.class_name,
      study_mode: cls.study_mode,
      semester: cls.semester,
      allocations: allocations.map((r) => ({
        id: r.id,
        teacher_id: r.teacher_id,
        teacher_code: r.teachers.teacher_id,
        teacher_name: r.teachers.full_name,
        subject_id: r.subject_class.subject_id,
        subject_name: r.subject_class.subjects.subject_name,
        start_time: toTimeString(r.start_time),
        end_time: toTimeString(r.end_time),
      })),
    },
    entries: rawRows.map((r) => ({
      id: r.id,
      allocation_id: r.allocation_id,
      day_of_week: r.day_of_week,
      location_hall: r.location_hall,
      teacher_id: r.teacher_id,
      teacher_code: r.teacher_code,
      teacher_name: r.teacher_name,
      subject_id: r.subject_id,
      subject_name: r.subject_name,
      class_id: r.class_id,
      class_name: r.class_name,
      time_start: toTimeString(r.start_time),
      time_end: toTimeString(r.end_time),
    })),
  }
}

export type TimetableClassRow = {
  id: number
  department_id: number
  class_name: string
  study_mode: string | null
  semester: string | null
}

export async function getTimetableClasses(): Promise<TimetableClassRow[]> {
  const session = await auth()
  const facultyId = (session?.user as any)?.faculty_id as number | undefined
  if (!facultyId) return []
  const rows = await prisma.classes.findMany({
    where: { departments: { faculty_id: facultyId } },
    select: {
      id: true,
      department_id: true,
      class_name: true,
      study_mode: true,
      semester: true,
    },
    orderBy: { id: "asc" },
  })
  return rows
}
