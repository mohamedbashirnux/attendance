"use server"

import { z } from "zod"
import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/backend_super_admin/auth/auth"

const studyModes = [
  "Full_Time_Morning",
  "Full_Time_Afternoon",
  "Full_Time_Evening",
  "Weekend",
] as const

const semesters = [
  "Semester_1",
  "Semester_2",
  "Semester_3",
  "Semester_4",
  "Semester_5",
  "Semester_6",
  "Semester_7",
  "Semester_8",
  "Semester_9",
  "Semester_10",
  "Semester_11",
  "Semester_12",
  "Semester_101",
  "Semester_102",
] as const

const schema = z.object({
  department_id: z.coerce.number().int().positive("Select a department"),
  class_name: z.string().trim().min(1, "Class name is required").max(50),
  study_mode: z.enum(studyModes),
  semester: z.enum(semesters),
  academic_year: z
    .string()
    .trim()
    .regex(/^\d{4}\/\d{4}$/, "Use format YYYY/YYYY")
    .max(9),
})

export async function updateClass(id: number, formData: FormData) {
  const session = await auth()
  const facultyId = (session?.user as any)?.faculty_id as number | undefined
  if (!facultyId) return { error: "Not authenticated" }

  const parsed = schema.safeParse({
    department_id: formData.get("department_id"),
    class_name: formData.get("class_name"),
    study_mode: formData.get("study_mode"),
    semester: formData.get("semester"),
    academic_year: formData.get("academic_year"),
  })
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" }
  }

  try {
    await prisma.classes.update({
      where: { id },
      data: { ...parsed.data },
    })
  } catch {
    return { error: "Could not update class" }
  }

  revalidatePath("/faculty_user/class")
  return { ok: true as const }
}
