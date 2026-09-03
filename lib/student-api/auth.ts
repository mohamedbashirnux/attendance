import { SignJWT, jwtVerify } from "jose"

const secret = new TextEncoder().encode(
  process.env.STUDENT_JWT_SECRET || "student-app-dev-secret-change-me"
)

export const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
}

export async function signStudentToken(studentDbId: number): Promise<string> {
  return new SignJWT({ studentDbId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("5m")
    .sign(secret)
}

export async function verifyStudentToken(
  token: string
): Promise<number | null> {
  try {
    const { payload } = await jwtVerify(token, secret)
    const id = payload.studentDbId
    return typeof id === "number" ? id : null
  } catch {
    return null
  }
}
