"use server"

import { z } from "zod"
import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"

const nameSchema = z
  .string()
  .trim()
  .min(1, "Faculty name is required")
  .max(100, "Faculty name must be 100 characters or less")

export async function createFaculty(formData: FormData) {
  const parsed = nameSchema.safeParse(formData.get("faculty_name"))
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid name" }
  }

  await prisma.faculty.create({ data: { faculty_name: parsed.data } })
  revalidatePath("/super_admin")
  return { ok: true as const }
}
