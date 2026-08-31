import { SignJWT, jwtVerify } from "jose"

const secret = new TextEncoder().encode(
  process.env.TEACHER_JWT_SECRET || "teacher-app-dev-secret-change-me"
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
    .setExpirationTime("5m")
    .sign(secret)
}

export async function verifyTeacherToken(
  token: string
): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, secret)
    return (payload.teacherId as string) ?? null
  } catch {
    return null
  }
}
