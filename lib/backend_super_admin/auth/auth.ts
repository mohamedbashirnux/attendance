import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import { z } from "zod"
import { pool } from "@/lib/db"

const credentialsSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
  role: z.string().optional(),
  faculty_id: z.string().optional(),
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
        role: { label: "Role", type: "text" },
        faculty_id: { label: "Faculty", type: "text" },
      },
      async authorize(raw) {
        const parsed = credentialsSchema.safeParse(raw)
        if (!parsed.success) return null

        const { username, password, role, faculty_id } = parsed.data

        if (role === "faculty") {
          const [rows] = await pool.query(
            "SELECT fu.*, f.faculty_name FROM faculty_users fu JOIN faculty f ON f.id = fu.faculty_id WHERE fu.username = ? LIMIT 1",
            [username]
          )
          const user = (rows as any[])[0]
          if (!user) return null
          if (faculty_id && user.faculty_id !== Number(faculty_id)) return null
          const valid = await bcrypt.compare(password, user.password)
          if (!valid) return null
          return {
            id: String(user.id),
            name: user.username,
            username: user.username,
            role: "faculty",
            faculty_id: user.faculty_id,
            faculty_name: user.faculty_name,
          } as any
        }

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
          role: "admin",
          faculty_id: null,
          faculty_name: null,
        } as any
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const u = user as any
        ;(token as any).username = u.username
        ;(token as any).role = u.role
        ;(token as any).faculty_id = u.faculty_id
        ;(token as any).faculty_name = u.faculty_name
      }
      return token
    },
    async session({ session, token }) {
      const t = token as any
      ;(session.user as any).username = t.username
      ;(session.user as any).role = t.role
      ;(session.user as any).faculty_id = t.faculty_id
      ;(session.user as any).faculty_name = t.faculty_name
      return session
    },
    authorized({ auth, request }) {
      const { pathname } = request.nextUrl
      const role = (auth?.user as any)?.role
      if (pathname.startsWith("/super_admin") && role !== "admin") return false
      if (pathname.startsWith("/faculty_user") && role !== "faculty") return false
      return !!auth
    },
  },
})
