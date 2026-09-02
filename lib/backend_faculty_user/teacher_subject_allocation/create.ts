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
    const sc = await prisma.subject_class.findFirst({
      where: {
        class_id: parsed.data.class_id,
        subject_id: parsed.data.subject_id,
      },
      select: { id: true },
    })
    if (!sc) return { error: "Subject is not assigned to the selected class" }

    // Build a Date that represents the given wall-clock time-of-day in UTC.
    // MySQL's `Time` column has no timezone, so we treat the HH:MM the user
    // picked as a literal "HH:MM of the day" and store it as a UTC Date.
    // On read, `time.ts#toTimeString` extracts the UTC components so the
    // round-trip is lossless across server timezones.
    const [sh, sm] = parsed.data.start_time.split(":")
    const [eh, em] = parsed.data.end_time.split(":")
    const startUtc = new Date(Date.UTC(1970, 0, 1, Number(sh), Number(sm), 0))
    const endUtc = new Date(Date.UTC(1970, 0, 1, Number(eh), Number(em), 0))

    await prisma.teacher_subject_allocation.create({
      data: {
        teacher_id: parsed.data.teacher_id,
        subject_class_id: sc.id,
        start_time: startUtc,
        end_time: endUtc,
      },
    })
  } catch {
    return { error: "Could not allocate (duplicate or invalid combination)" }
  }

  revalidatePath("/faculty_user/teacher-allocation")
  return { ok: true as const }
}
