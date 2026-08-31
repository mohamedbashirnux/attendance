"use server"

import { z } from "zod"
import bcrypt from "bcryptjs"
import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/backend_super_admin/auth/auth"

const schema = z.object({
  student_id: z.string().trim().min(1, "Student ID is required").max(20),
  class_id: z.coerce.number().int().positive("Select a class"),
  full_name: z.string().trim().min(1, "Full name is required").max(100),
  phone: z
    .string()
    .trim()
    .max(20)
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : null)),
  password: z.string().min(1, "Password is required").max(255),
  status: z.enum(["pending", "approved"]).default("approved"),
})

export async function createStudent(formData: FormData) {
  const session = await auth()
  const facultyId = (session?.user as any)?.faculty_id as number | undefined
  if (!facultyId) return { error: "Not authenticated" }

  const parsed = schema.safeParse({
    student_id: formData.get("student_id"),
    class_id: formData.get("class_id"),
    full_name: formData.get("full_name"),
    phone: formData.get("phone") ?? "",
    password: formData.get("password"),
    status: formData.get("status") ?? "approved",
  })
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" }
  }

  // Ensure the class belongs to this faculty
  const cls = await prisma.classes.findFirst({
    where: { id: parsed.data.class_id, departments: { faculty_id: facultyId } },
    select: { id: true },
  })
  if (!cls) return { error: "Class not found in your faculty" }

  const hashed = await bcrypt.hash(parsed.data.password, 10)

  try {
    await prisma.students.create({
      data: {
        student_id: parsed.data.student_id,
        class_id: parsed.data.class_id,
        full_name: parsed.data.full_name,
        phone: parsed.data.phone,
        password: hashed,
        status: parsed.data.status,
      },
    })
  } catch {
    return { error: "Could not create student (student ID may already exist)" }
  }

  revalidatePath("/faculty_user/student")
  return { ok: true as const }
}
