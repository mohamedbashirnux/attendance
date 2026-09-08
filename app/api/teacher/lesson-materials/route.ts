import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { verifyTeacherToken, corsHeaders } from "@/lib/teacher-api/auth"

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders })
}

// GET /api/teacher/lesson-materials?subject_class_id=123
// Returns lesson materials that the logged-in teacher has uploaded.
// If subject_class_id is given, filters to that specific class/subject.
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization")
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: corsHeaders })
  }

  const teacherIdStr = await verifyTeacherToken(token)
  if (!teacherIdStr) {
    return NextResponse.json({ error: "Invalid or expired token" }, { status: 401, headers: corsHeaders })
  }

  const teacherId = parseInt(teacherIdStr, 10)
  if (!teacherId || isNaN(teacherId)) {
    return NextResponse.json({ error: "Invalid teacher id in token" }, { status: 401, headers: corsHeaders })
  }

  const { searchParams } = new URL(req.url)
  const subjectClassIdParam = searchParams.get("subject_class_id")
  const statusParam = searchParams.get("status") // active or archived

  // The teacher must have an allocation that links to the class; the
  // raw DB has no extra teacher authorization beyond being the uploader,
  // but the user asked: "use the same as when he take attendace" — meaning
  // the material is tied to the class the teacher teaches.

  const whereClauses: string[] = ["lm.uploaded_by_teacher_id = ?"]
  const params: (string | number)[] = [teacherId]

  if (subjectClassIdParam) {
    const sid = parseInt(subjectClassIdParam, 10)
    if (!isNaN(sid)) {
      whereClauses.push("lm.subject_class_id = ?")
      params.push(sid)
    }
  }

  if (statusParam && (statusParam === "active" || statusParam === "archived")) {
    whereClauses.push("lm.status = ?")
    params.push(statusParam)
  }

  const query = `
    SELECT
      lm.id,
      lm.subject_class_id,
      lm.title,
      lm.description,
      lm.file_path,
      lm.file_name,
      lm.file_size,
      lm.status,
      lm.created_at,
      lm.updated_at,
      sc.id AS subject_class_id,
      s.subject_name,
      c.class_name,
      d.department_name,
      f.faculty_name
    FROM lesson_materials lm
    JOIN subject_class sc ON sc.id = lm.subject_class_id
    JOIN subjects s ON s.id = sc.subject_id
    JOIN classes c ON c.id = sc.class_id
    JOIN departments d ON d.id = c.department_id
    JOIN faculty f ON f.id = d.faculty_id
    WHERE ${whereClauses.join(" AND ")}
    ORDER BY lm.created_at DESC
  `

  const rows: any[] = await prisma.$queryRawUnsafe(query, ...params)

  return NextResponse.json(
    {
      teacher_id: teacherId,
      count: rows.length,
      materials: rows.map((r) => ({
        id: r.id,
        subject_class_id: r.subject_class_id,
        title: r.title,
        description: r.description,
        file_path: r.file_path,
        file_name: r.file_name,
        file_size: r.file_size,
        status: r.status,
        subject_name: r.subject_name,
        class_name: r.class_name,
        department_name: r.department_name,
        faculty_name: r.faculty_name,
        created_at: r.created_at ? new Date(r.created_at).toISOString() : null,
        updated_at: r.updated_at ? new Date(r.updated_at).toISOString() : null,
      })),
    },
    { status: 200, headers: corsHeaders }
  )
}

// POST /api/teacher/lesson-materials
// Create a new lesson material. The body is JSON (file metadata); the
// actual file is expected to have been uploaded separately (e.g. via a
// multipart endpoint or to a static file store). This endpoint writes
// the DB record.
const createSchema = z.object({
  subject_class_id: z.coerce.number().int().positive("subject_class_id is required"),
  title: z.string().min(1, "title is required").max(255),
  description: z.string().optional().nullable(),
  file_path: z.string().min(1, "file_path is required").max(500),
  file_name: z.string().min(1, "file_name is required").max(255),
  file_size: z.coerce.number().int().min(0, "file_size must be >= 0").optional().nullable(),
  status: z.enum(["active", "archived"]).optional().default("active"),
})

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization")
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: corsHeaders })
  }

  const teacherIdStr = await verifyTeacherToken(token)
  if (!teacherIdStr) {
    return NextResponse.json({ error: "Invalid or expired token" }, { status: 401, headers: corsHeaders })
  }
  const teacherId = parseInt(teacherIdStr, 10)
  if (!teacherId || isNaN(teacherId)) {
    return NextResponse.json({ error: "Invalid teacher id in token" }, { status: 401, headers: corsHeaders })
  }

  // Verify the teacher has access to the class they are uploading for.
  // We look up the subject_class -> class -> department -> faculty and
  // also verify this teacher has an allocation for it.
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400, headers: corsHeaders })
  }

  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400, headers: corsHeaders }
    )
  }

  const data = parsed.data
  const subjectClass = await prisma.subject_class.findUnique({
    where: { id: data.subject_class_id },
    include: { classes: { include: { departments: { include: { faculty: true } } } }, subjects: true },
  })
  if (!subjectClass) {
    return NextResponse.json({ error: "Subject/class not found" }, { status: 404, headers: corsHeaders })
  }

  // Confirm the teacher has an allocation for this subject_class.
  const allocation = await prisma.teacher_subject_allocation.findFirst({
    where: {
      teacher_id: teacherId,
      subject_class_id: data.subject_class_id,
    },
    select: { id: true },
  })
  if (!allocation) {
    return NextResponse.json(
      { error: "You are not assigned to this class/subject" },
      { status: 403, headers: corsHeaders }
    )
  }

  const created = await prisma.lesson_materials.create({
    data: {
      subject_class_id: data.subject_class_id,
      title: data.title,
      description: data.description ?? null,
      file_path: data.file_path,
      file_name: data.file_name,
      file_size: data.file_size ?? null,
      uploaded_by_teacher_id: teacherId,
      status: data.status,
    },
  })

  return NextResponse.json(
    {
      id: created.id,
      title: created.title,
      description: created.description,
      file_path: created.file_path,
      file_name: created.file_name,
      file_size: created.file_size,
      status: created.status,
      subject_class_id: created.subject_class_id,
      created_at: created.created_at.toISOString(),
    },
    { status: 201, headers: corsHeaders }
  )
}
