"use server"

import { z } from "zod"
import bcrypt from "bcryptjs"
import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"

const schema = z.object({
  teacher_id: z.string().trim().min(1).max(50),
  full_name: z.string().trim().min(1).max(255),
  username: z.string().trim().min(1).max(100),
  password: z.string().max(255).optional().default(""),
})

export async function updateTeacher(id: number, formData: FormData) {
  const parsed = schema.safeParse({
    teacher_id: formData.get("teacher_id"),
    full_name: formData.get("full_name"),
    username: formData.get("username"),
    password: formData.get("password") ?? "",
  })
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" }
  }

  const data: {
    teacher_id: string
    full_name: string
    username: string
    password?: string
  } = {
    teacher_id: parsed.data.teacher_id,
    full_name: parsed.data.full_name,
    username: parsed.data.username,
  }

  if (parsed.data.password) {
    data.password = await bcrypt.hash(parsed.data.password, 10)
  }

  try {
    await prisma.teachers.update({ where: { id }, data })
  } catch {
    return { error: "Could not update teacher" }
  }

  revalidatePath("/faculty_user/teacher")
  return { ok: true as const }
}
