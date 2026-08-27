import { SignJWT, jwtVerify } from "jose"
import { prisma } from "@/lib/prisma"
import {
  labelFor,
  studyModeOptions,
  semesterOptions,
} from "@/lib/backend_faculty_user/class/enums"

const secret = new TextEncoder().encode(
  process.env.STUDENT_JWT_SECRET || "student-app-dev-secret"
)

export const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
}

export async function signStudentToken(studentId: string): Promise<string> {
  return new SignJWT({ studentId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secret)
}

export async function verifyStudentToken(token: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, secret)
    return (payload.studentId as string) ?? null
  } catch {
    return null
  }
}

export type StudentProfile = {
  student_id: string
  full_name: string
  phone: string | null
  status: string | null
  created_at: string
  class: {
    id: number
    class_name: string
    department_name: string
    faculty_id: number
    faculty_name: string
    study_mode: string
    study_mode_label: string
    semester: string
    semester_label: string
    academic_year: string
  } | null
}

export async function getStudentProfile(
  studentId: string
): Promise<StudentProfile | null> {
  const student = await prisma.students.findUnique({
    where: { student_id: studentId },
    include: { classes: { include: { departments: { include: { faculty: true } } } } },
  })
  if (!student) return null

  return {
    student_id: student.student_id,
    full_name: student.full_name,
    phone: student.phone,
    status: student.status,
    created_at: student.created_at.toISOString(),
    class: student.classes
      ? {
          id: student.classes.id,
          class_name: student.classes.class_name,
          department_name: student.classes.departments.department_name,
          faculty_id: student.classes.departments.faculty.id,
          faculty_name: student.classes.departments.faculty.faculty_name,
          study_mode: student.classes.study_mode,
          study_mode_label: labelFor(studyModeOptions, student.classes.study_mode),
          semester: student.classes.semester,
          semester_label: labelFor(semesterOptions, student.classes.semester),
          academic_year: student.classes.academic_year,
        }
      : null,
  }
}
