import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import { z } from "zod"
import { pool } from "@/lib/db"

const credentialsSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
})

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(raw) {
        const parsed = credentialsSchema.safeParse(raw)
        if (!parsed.success) return null

        const { username, password } = parsed.data

        const [rows] = await pool.query(
          "SELECT * FROM super_admin WHERE username = ? LIMIT 1",
          [username]
        )
        const user = (rows as any[])[0]
        if (!user) return null

        const valid = await bcrypt.compare(password, user.password)
        if (!valid) return null

        return {
          id: String(user.id),
          name: user.full_name,
          username: user.username,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        ;(token as any).username = (user as any).username
      }
      return token
    },
    async session({ session, token }) {
      ;(session.user as any).username = (token as any).username
      return session
    },
    authorized({ auth }) {
      return !!auth
    },
  },
})
