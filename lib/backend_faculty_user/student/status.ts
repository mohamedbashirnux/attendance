"use server"

import { z } from "zod"
import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/backend_super_admin/auth/auth"

const STATUS_VALUES = ["pending", "approved"] as const
type StudentStatus = (typeof STATUS_VALUES)[number]

/**
 * Server action: change one student's status. Used by the clickable
 * status badge in each row of the student table.
 */
export async function setStudentStatus(id: number, newStatus: string) {
  const session = await auth()
  const facultyId = (session?.user as any)?.faculty_id as number | undefined
  if (!facultyId) return { error: "Not authenticated" }
  if (!STATUS_VALUES.includes(newStatus as StudentStatus)) {
    return { error: "Invalid status" }
  }

  // Verify the student belongs to a class in this faculty.
  const student = await prisma.students.findUnique({
    where: { id },
    include: { classes: { include: { departments: true } } },
  })
  if (!student) return { error: "Student not found" }
  if (student.classes.departments.faculty_id !== facultyId) {
    return { error: "Student does not belong to your faculty" }
  }

  try {
    await prisma.students.update({
      where: { id },
      data: { status: newStatus as StudentStatus },
    })
  } catch {
    return { error: "Could not update status" }
  }

  revalidatePath("/faculty_user/student")
  return { ok: true as const }
}

/**
 * Server action: set the status of every student in the given class.
 * Used by the "Mark all" header button.
 */
export async function setClassStudentsStatus(
  classId: number,
  newStatus: string
) {
  const session = await auth()
  const facultyId = (session?.user as any)?.faculty_id as number | undefined
  if (!facultyId) return { error: "Not authenticated" }
  if (!STATUS_VALUES.includes(newStatus as StudentStatus)) {
    return { error: "Invalid status" }
  }

  // Verify the class is in this faculty.
  const cls = await prisma.classes.findFirst({
    where: { id: classId, departments: { faculty_id: facultyId } },
    select: { id: true },
  })
  if (!cls) return { error: "Class not found in your faculty" }

  try {
    await prisma.students.updateMany({
      where: { class_id: classId },
      data: { status: newStatus as StudentStatus },
    })
  } catch {
    return { error: "Could not update students" }
  }

  revalidatePath("/faculty_user/student")
  return { ok: true as const }
}
