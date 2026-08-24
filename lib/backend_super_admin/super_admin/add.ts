"use server"

import { z } from "zod"
import bcrypt from "bcryptjs"
import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"

const schema = z.object({
  full_name: z.string().trim().min(1, "Full name is required").max(100),
  username: z.string().trim().min(1, "Username is required").max(50),
  password: z.string().min(6, "Password must be at least 6 characters"),
})

export async function createSuperAdmin(formData: FormData) {
  const parsed = schema.safeParse({
    full_name: formData.get("full_name"),
    username: formData.get("username"),
    password: formData.get("password"),
  })
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" }
  }

  const hash = await bcrypt.hash(parsed.data.password, 10)
  try {
    await prisma.super_admin.create({
      data: {
        full_name: parsed.data.full_name,
        username: parsed.data.username,
        password: hash,
      },
    })
  } catch {
    return { error: "Username already exists" }
  }

  revalidatePath("/super_admin/super_admin")
  return { ok: true as const }
}
