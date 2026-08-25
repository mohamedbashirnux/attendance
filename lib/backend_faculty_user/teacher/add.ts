"use server"

import { z } from "zod"
import bcrypt from "bcryptjs"
import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/backend_super_admin/auth/auth"

const schema = z.object({
  teacher_id: z.string().trim().min(1, "Teacher ID is required").max(50),
  full_name: z.string().trim().min(1, "Full name is required").max(255),
  username: z.string().trim().min(1, "Username is required").max(100),
  password: z.string().min(1, "Password is required").max(255),
})

export async function createTeacher(formData: FormData) {
  const parsed = schema.safeParse({
    teacher_id: formData.get("teacher_id"),
    full_name: formData.get("full_name"),
    username: formData.get("username"),
    password: formData.get("password"),
  })
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" }
  }

  const session = await auth()
  const facultyId = (session?.user as any)?.faculty_id as number | undefined
  if (!facultyId) {
    return { error: "Session faculty not found" }
  }

  const hashed = await bcrypt.hash(parsed.data.password, 10)

  try {
    await prisma.teachers.create({
      data: {
        teacher_id: parsed.data.teacher_id,
        faculty_id: facultyId,
        full_name: parsed.data.full_name,
        username: parsed.data.username,
        password: hashed,
      },
    })
  } catch {
    return { error: "Could not create teacher (teacher ID or username may already exist)" }
  }

  revalidatePath("/faculty_user/teacher")
  return { ok: true as const }
}
