"use server"

import { z } from "zod"
import { signIn } from "@/lib/backend_super_admin/auth/auth"
import { AuthError } from "next-auth"

const schema = z.object({
  faculty_id: z.string().min(1, "Select your faculty"),
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
})

export async function facultyLoginAction(
  _prevState: { errors?: Record<string, string[]>; error?: string } | undefined,
  formData: FormData
) {
  const parsed = schema.safeParse({
    faculty_id: formData.get("faculty_id"),
    username: formData.get("username"),
    password: formData.get("password"),
  })

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors }
  }

  try {
    await signIn("credentials", {
      username: parsed.data.username,
      password: parsed.data.password,
      role: "faculty",
      faculty_id: parsed.data.faculty_id,
      redirectTo: "/faculty_user",
    })
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Invalid faculty, username or password" }
    }
    throw error
  }
}
