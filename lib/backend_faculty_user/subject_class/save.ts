"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/backend_super_admin/auth/auth"

export async function saveSubjectClass(classId: number, subjectIds: number[]) {
  const session = await auth()
  const facultyId = (session?.user as any)?.faculty_id as number | undefined
  if (!facultyId) return { error: "Not authenticated" }

  const cls = await prisma.classes.findFirst({
    where: { id: classId, departments: { faculty_id: facultyId } },
  })
  if (!cls) return { error: "Class not found" }

  const current = await prisma.subject_class.findMany({
    where: { class_id: classId, classes: { departments: { faculty_id: facultyId } } },
    select: { subject_id: true },
  })
  const currentIds = new Set(current.map((c) => c.subject_id))
  const wanted = Array.isArray(subjectIds) ? subjectIds : []
  const wantedSet = new Set(wanted)

  const toAdd = wanted.filter((id) => !currentIds.has(id))
  const toRemove = [...currentIds].filter((id) => !wantedSet.has(id))

  try {
    if (toRemove.length) {
      await prisma.subject_class.deleteMany({
        where: {
          class_id: classId,
          subject_id: { in: toRemove },
        },
      })
    }
    if (toAdd.length) {
      await prisma.subject_class.createMany({
        data: toAdd.map((subject_id) => ({
          class_id: classId,
          subject_id,
        })),
      })
    }
  } catch {
    return { error: "Could not save subject assignments" }
  }

  revalidatePath("/faculty_user/subject-class")
  return { ok: true as const }
}
