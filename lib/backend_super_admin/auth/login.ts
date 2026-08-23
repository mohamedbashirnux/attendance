"use server"

import { z } from "zod"
import { signIn } from "@/lib/backend_super_admin/auth/auth"
import { AuthError } from "next-auth"

const schema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
})

export async function loginAction(
  _prevState: { errors?: Record<string, string[]>; error?: string } | undefined,
  formData: FormData
) {
  const parsed = schema.safeParse({
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
      redirectTo: "/super_admin",
    })
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Invalid username or password" }
    }
    throw error
  }
}
