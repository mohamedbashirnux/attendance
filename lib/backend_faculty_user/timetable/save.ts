"use server"

import { z } from "zod"
import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/backend_super_admin/auth/auth"

// The prisma/schema.prisma in the repo is stale and lists extra
// `class_id` / `time_start` / `time_end` columns on the `timetable`
// model that DO NOT EXIST in the live MySQL DB. To stay safe we use
// raw SQL for writes (and reads in fetch.ts) so we only touch the
// columns that actually exist:
//
//   timetable(id, allocation_id, day_of_week, location_hall, created_at, updated_at)
//
// day_of_week is a MySQL ENUM ('Monday'..'Sunday'). MySQL happily
// accepts a string literal that matches an enum label.

const createSchema = z.object({
  allocation_id: z.coerce.number().int().positive("Select a subject"),
  class_id: z.coerce.number().int().positive("Missing class"),
  day_of_week: z.string().min(1, "Pick a day of the week"),
  location_hall: z.string().optional().nullable(),
})

const updateSchema = createSchema.extend({
  id: z.coerce.number().int().positive("Missing id"),
})

async function assertFacultyCanSeeClass(classId: number) {
  const session = await auth()
  const facultyId = (session?.user as any)?.faculty_id as number | undefined
  if (!facultyId) return false
  const cls = await prisma.classes.findFirst({
    where: { id: classId, departments: { faculty_id: facultyId } },
    select: { id: true },
  })
  return !!cls
}

function esc(v: string): string {
  // Escape single quotes for the day_of_week string. location_hall
  // and similar are passed via parameters to keep things simple.
  return v.replace(/'/g, "''")
}

export async function createTimetable(formData: FormData) {
  const parsed = createSchema.safeParse({
    allocation_id: formData.get("allocation_id"),
    class_id: formData.get("class_id"),
    day_of_week: formData.get("day_of_week"),
    location_hall: (formData.get("location_hall") as string) || null,
  })
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" }
  }

  if (!(await assertFacultyCanSeeClass(parsed.data.class_id))) {
    return { error: "Class not found in your faculty" }
  }

  // Verify the allocation belongs to this class.
  const alloc = await prisma.teacher_subject_allocation.findFirst({
    where: {
      id: parsed.data.allocation_id,
      subject_class: { class_id: parsed.data.class_id },
    },
    select: { id: true },
  })
  if (!alloc) {
    return { error: "That subject/teacher is not allocated to this class" }
  }

  try {
    await prisma.$executeRawUnsafe(
      `INSERT INTO timetable (allocation_id, day_of_week, location_hall, created_at, updated_at)
       VALUES (?, ?, ?, NOW(), NOW())`,
      parsed.data.allocation_id,
      parsed.data.day_of_week,
      parsed.data.location_hall
    )
  } catch (e) {
    console.error("createTimetable failed", e)
    return { error: "Could not create timetable entry" }
  }

  revalidatePath("/faculty_user/timetable")
  return { ok: true as const }
}

export async function updateTimetable(formData: FormData) {
  const parsed = updateSchema.safeParse({
    id: formData.get("id"),
    allocation_id: formData.get("allocation_id"),
    class_id: formData.get("class_id"),
    day_of_week: formData.get("day_of_week"),
    location_hall: (formData.get("location_hall") as string) || null,
  })
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" }
  }

  if (!(await assertFacultyCanSeeClass(parsed.data.class_id))) {
    return { error: "Class not found in your faculty" }
  }

  try {
    await prisma.$executeRawUnsafe(
      `UPDATE timetable
       SET allocation_id = ?, day_of_week = ?, location_hall = ?, updated_at = NOW()
       WHERE id = ?`,
      parsed.data.allocation_id,
      parsed.data.day_of_week,
      parsed.data.location_hall,
      parsed.data.id
    )
  } catch (e) {
    console.error("updateTimetable failed", e)
    return { error: "Could not update timetable entry" }
  }

  revalidatePath("/faculty_user/timetable")
  return { ok: true as const }
}

export async function deleteTimetable(id: number, classId: number) {
  try {
    if (!(await assertFacultyCanSeeClass(classId))) {
      return { error: "Class not found in your faculty" }
    }
    // Confirm the entry's allocation actually belongs to this class
    // before deleting — defensive, since the row is keyed only by
    // allocation_id (no class_id column on the live timetable table).
    const rows = (await prisma.$queryRawUnsafe(
      `SELECT tsa.subject_class_id, sc.class_id
         FROM timetable t
         JOIN teacher_subject_allocation tsa ON tsa.id = t.allocation_id
         JOIN subject_class sc ON sc.id = tsa.subject_class_id
        WHERE t.id = ?
        LIMIT 1`,
      id
    )) as Array<{ class_id: number }>
    if (rows.length === 0) {
      return { error: "Entry not found" }
    }
    if (rows[0].class_id !== classId) {
      return { error: "Entry not found in your faculty" }
    }
    await prisma.$executeRawUnsafe(`DELETE FROM timetable WHERE id = ?`, id)
  } catch (e) {
    console.error("deleteTimetable failed", e)
    return { error: "Could not delete timetable entry" }
  }
  revalidatePath("/faculty_user/timetable")
  return { ok: true as const }
}
