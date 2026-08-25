"use server"

import { z } from "zod"
import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"

const schema = z.object({
  teacher_id: z.coerce.number().int().positive("Select a teacher"),
  class_id: z.coerce.number().int().positive("Select a class"),
  subject_id: z.coerce.number().int().positive("Select a subject"),
  start_time: z.string().min(1, "Start time is required"),
  end_time: z.string().min(1, "End time is required"),
})

export async function createAllocation(formData: FormData) {
  const parsed = schema.safeParse({
    teacher_id: formData.get("teacher_id"),
    class_id: formData.get("class_id"),
    subject_id: formData.get("subject_id"),
    start_time: formData.get("start_time"),
    end_time: formData.get("end_time"),
  })
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" }
  }

  try {
    await prisma.teacher_subject_allocation.create({
      data: {
        teacher_id: parsed.data.teacher_id,
        class_id: parsed.data.class_id,
        subject_id: parsed.data.subject_id,
        start_time: new Date(`1970-01-01T${parsed.data.start_time}:00`),
        end_time: new Date(`1970-01-01T${parsed.data.end_time}:00`),
      },
    })
  } catch {
    return { error: "Could not allocate (duplicate or invalid combination)" }
  }

  revalidatePath("/faculty_user/teacher-allocation")
  return { ok: true as const }
}
