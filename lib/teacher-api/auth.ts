import { SignJWT, jwtVerify } from "jose"
import { prisma } from "@/lib/prisma"

const secret = new TextEncoder().encode(
  process.env.STUDENT_JWT_SECRET || "teacher-app-dev-secret"
)

export const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
}

export async function signTeacherToken(teacherId: string): Promise<string> {
  return new SignJWT({ teacherId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secret)
}

export async function verifyTeacherToken(token: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, secret)
    return (payload.teacherId as string) ?? null
  } catch {
    return null
  }
}

export type TeacherAllocation = {
  subject_class_id: number
  class_id: number
  class_name: string
  subject_name: string
  start_time: string
  end_time: string
  status: string | null
}

export type TeacherProfile = {
  teacher_id: string
  full_name: string
  faculty_id: number
  faculty_name: string
  created_at: string
  allocations: TeacherAllocation[]
}

export async function getTeacherProfile(
  teacherId: string
): Promise<TeacherProfile | null> {
  const teacher = await prisma.teachers.findUnique({
    where: { teacher_id: teacherId },
    include: {
      faculty: true,
      teacher_subject_allocation: {
        include: {
          subject_class: { include: { classes: true, subjects: true } },
        },
      },
    },
  })
  if (!teacher) return null

  return {
    teacher_id: teacher.teacher_id,
    full_name: teacher.full_name,
    faculty_id: teacher.faculty.id,
    faculty_name: teacher.faculty.faculty_name,
    created_at: teacher.created_at.toISOString(),
    allocations: teacher.teacher_subject_allocation.map((a) => ({
      subject_class_id: a.subject_class.id,
      class_id: a.subject_class.class_id,
      class_name: a.subject_class.classes.class_name,
      subject_name: a.subject_class.subjects.subject_name,
      start_time: a.start_time.toISOString(),
      end_time: a.end_time.toISOString(),
      status: a.status,
    })),
  }
}
