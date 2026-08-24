"use server"

import { z } from "zod"
import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"

const schema = z.object({
  faculty_id: z.coerce.number().int().positive("Select a faculty"),
  department_name: z
    .string()
    .trim()
    .min(1, "Department name is required")
    .max(100),
})

export async function updateDepartment(id: number, formData: FormData) {
  const parsed = schema.safeParse({
    faculty_id: formData.get("faculty_id"),
    department_name: formData.get("department_name"),
  })
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" }
  }

  try {
    await prisma.departments.update({
      where: { id },
      data: {
        faculty_id: parsed.data.faculty_id,
        department_name: parsed.data.department_name,
      },
    })
  } catch {
    return { error: "Could not update department" }
  }

  revalidatePath("/faculty_user/department")
  return { ok: true as const }
}
