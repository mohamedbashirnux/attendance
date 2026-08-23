"use server"

import { z } from "zod"
import bcrypt from "bcryptjs"
import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"

const schema = z.object({
  faculty_id: z.coerce.number().int().positive("Select a faculty"),
  username: z.string().trim().min(1, "Username is required").max(50),
  password: z.string().min(6, "Password must be at least 6 characters"),
})

export async function createFacultyUser(formData: FormData) {
  const parsed = schema.safeParse({
    faculty_id: formData.get("faculty_id"),
    username: formData.get("username"),
    password: formData.get("password"),
  })
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" }
  }

  const hash = await bcrypt.hash(parsed.data.password, 10)
  try {
    await prisma.faculty_users.create({
      data: {
        faculty_id: parsed.data.faculty_id,
        username: parsed.data.username,
        password: hash,
      },
    })
  } catch {
    return { error: "Username already exists or faculty is invalid" }
  }

  revalidatePath("/super_admin/faculty_users")
  return { ok: true as const }
}
