"use server"

import { z } from "zod"
import bcrypt from "bcryptjs"
import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"

const schema = z.object({
  full_name: z.string().trim().min(1, "Full name is required").max(100),
  username: z.string().trim().min(1, "Username is required").max(50),
  password: z
    .string()
    .max(255)
    .optional()
    .or(z.literal("")),
})

export async function updateSuperAdmin(id: number, formData: FormData) {
  const parsed = schema.safeParse({
    full_name: formData.get("full_name"),
    username: formData.get("username"),
    password: formData.get("password") ?? "",
  })
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" }
  }

  const data: { full_name: string; username: string; password?: string } = {
    full_name: parsed.data.full_name,
    username: parsed.data.username,
  }
  if (parsed.data.password) {
    data.password = await bcrypt.hash(parsed.data.password, 10)
  }

  try {
    await prisma.super_admin.update({
      where: { id },
      data,
    })
  } catch {
    return { error: "Username already exists" }
  }

  revalidatePath("/super_admin/super_admin")
  return { ok: true as const }
}
