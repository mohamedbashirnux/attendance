
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { verifyTeacherToken, corsHeaders } from "@/lib/teacher-api/auth"
import { uploadToFTP } from "@/lib/ftp"

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders,
  })
}

// GET /api/teacher/lesson-materials?subject_class_id=123
// Returns lesson materials uploaded by the logged-in teacher.
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization")
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : null

  if (!token) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401, headers: corsHeaders }
    )
  }

  const teacherCode = await verifyTeacherToken(token)

  if (!teacherCode) {
    return NextResponse.json(
      { error: "Invalid or expired token" },
      { status: 401, headers: corsHeaders }
    )
  }

  const teacher = await prisma.teachers.findUnique({
    where: { teacher_id: teacherCode },
  })

  if (!teacher) {
    return NextResponse.json(
      { error: "Teacher not found" },
      { status: 404, headers: corsHeaders }
    )
  }

  const teacherId = teacher.id

  const { searchParams } = new URL(req.url)
  const subjectClassIdParam = searchParams.get("subject_class_id")
  const statusParam = searchParams.get("status")

  const whereClauses: string[] = [
    "lm.uploaded_by_teacher_id = ?",
  ]

  const params: (string | number)[] = [teacherId]

  if (subjectClassIdParam) {
    const sid = parseInt(subjectClassIdParam, 10)

    if (!isNaN(sid)) {
      whereClauses.push("lm.subject_class_id = ?")
      params.push(sid)
    }
  }

  if (
    statusParam &&
    (statusParam === "active" || statusParam === "archived")
  ) {
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

  const rows: any[] = await prisma.$queryRawUnsafe(
    query,
    ...params
  )

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
        created_at: r.created_at
          ? new Date(r.created_at).toISOString()
          : null,
        updated_at: r.updated_at
          ? new Date(r.updated_at).toISOString()
          : null,
      })),
    },
    {
      status: 200,
      headers: corsHeaders,
    }
  )
}

// POST /api/teacher/lesson-materials
//
// Receives multipart/form-data:
//
// subject_class_id
// title
// description
// file
//
// The actual file is uploaded to cPanel storage through FTP/FTPS.
// The database stores the file path and metadata.

const metadataSchema = z.object({
  subject_class_id: z.coerce
    .number()
    .int()
    .positive("subject_class_id is required"),

  title: z
    .string()
    .min(1, "title is required")
    .max(255),

  description: z
    .string()
    .optional()
    .nullable(),
})

export async function POST(req: NextRequest) {
  // ----------------------------------------
  // 1. Authentication
  // ----------------------------------------

  const authHeader = req.headers.get("authorization")

  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : null

  if (!token) {
    return NextResponse.json(
      { error: "Unauthorized" },
      {
        status: 401,
        headers: corsHeaders,
      }
    )
  }

  const teacherCode = await verifyTeacherToken(token)

  if (!teacherCode) {
    return NextResponse.json(
      { error: "Invalid or expired token" },
      {
        status: 401,
        headers: corsHeaders,
      }
    )
  }

  const teacher = await prisma.teachers.findUnique({
    where: { teacher_id: teacherCode },
  })

  if (!teacher) {
    return NextResponse.json(
      { error: "Teacher not found" },
      {
        status: 404,
        headers: corsHeaders,
      }
    )
  }

  const teacherId = teacher.id

  // ----------------------------------------
  // 2. Read multipart/form-data
  // ----------------------------------------

  let formData: FormData

  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json(
      { error: "Invalid multipart/form-data body" },
      {
        status: 400,
        headers: corsHeaders,
      }
    )
  }

  const subjectClassId = formData.get("subject_class_id")
  const title = formData.get("title")
  const description = formData.get("description")
  const file = formData.get("file")

  // ----------------------------------------
  // 3. Validate metadata
  // ----------------------------------------

  const parsed = metadataSchema.safeParse({
    subject_class_id: subjectClassId,
    title,
    description:
      typeof description === "string"
        ? description
        : null,
  })

  if (!parsed.success) {
    return NextResponse.json(
      {
        error:
          parsed.error.issues[0]?.message ??
          "Invalid input",
      },
      {
        status: 400,
        headers: corsHeaders,
      }
    )
  }

  // ----------------------------------------
  // 4. Validate uploaded file
  // ----------------------------------------

  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "file is required" },
      {
        status: 400,
        headers: corsHeaders,
      }
    )
  }

  if (file.size <= 0) {
    return NextResponse.json(
      { error: "Uploaded file is empty" },
      {
        status: 400,
        headers: corsHeaders,
      }
    )
  }

  // Maximum file size: 20 MB
  const MAX_FILE_SIZE = 20 * 1024 * 1024

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      {
        error: "File size must be 20 MB or less",
      },
      {
        status: 400,
        headers: corsHeaders,
      }
    )
  }

  // ----------------------------------------
  // 5. Validate file type
  // ----------------------------------------

  const allowedExtensions = [
    "pdf",
    "doc",
    "docx",
    "ppt",
    "pptx",
    "xls",
    "xlsx",
    "txt",
  ]

  const originalFileName = file.name || ""
  const fileExt = originalFileName.includes(".")
    ? originalFileName.split(".").pop()?.toLowerCase() ?? ""
    : ""

  const allowedTypes = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "text/plain",
    "application/octet-stream",
  ]

  const isAllowedExt = allowedExtensions.includes(fileExt)
  const isAllowedType = allowedTypes.includes(file.type)

  if (!isAllowedExt && !isAllowedType) {
    return NextResponse.json(
      {
        error:
          "Invalid file type. Allowed: PDF, Word, PowerPoint, Excel, and text files.",
      },
      {
        status: 400,
        headers: corsHeaders,
      }
    )
  }

  // ----------------------------------------
  // 6. Verify subject/class exists
  // ----------------------------------------

  const data = parsed.data

  const subjectClass =
    await prisma.subject_class.findUnique({
      where: {
        id: data.subject_class_id,
      },
      include: {
        classes: {
          include: {
            departments: {
              include: {
                faculty: true,
              },
            },
          },
        },
        subjects: true,
      },
    })

  if (!subjectClass) {
    return NextResponse.json(
      { error: "Subject/class not found" },
      {
        status: 404,
        headers: corsHeaders,
      }
    )
  }

  // ----------------------------------------
  // 7. Verify teacher allocation
  // ----------------------------------------

  const allocation =
    await prisma.teacher_subject_allocation.findFirst({
      where: {
        teacher_id: teacherId,
        subject_class_id: data.subject_class_id,
      },
      select: {
        id: true,
      },
    })

  if (!allocation) {
    return NextResponse.json(
      {
        error:
          "You are not assigned to this class/subject",
      },
      {
        status: 403,
        headers: corsHeaders,
      }
    )
  }

  // ----------------------------------------
  // 8. Generate safe filename
  // ----------------------------------------

  const extension = fileExt

  const safeExtension = extension
    .replace(/[^a-z0-9]/gi, "")
    .slice(0, 10)

  const uniqueName =
    `${Date.now()}-${crypto.randomUUID()}` +
    (safeExtension ? `.${safeExtension}` : "")

  // Store files organized by subject/class.
  const remotePath =
  `/lesson-materials/${uniqueName}`

  // ----------------------------------------
  // 9. Upload actual file to cPanel
  // ----------------------------------------

  let fileBuffer: Buffer

  try {
    fileBuffer = Buffer.from(
      await file.arrayBuffer()
    )
  } catch (error) {
    console.error(
      "Failed to read uploaded file:",
      error
    )

    return NextResponse.json(
      { error: "Failed to read uploaded file" },
      {
        status: 500,
        headers: corsHeaders,
      }
    )
  }

  try {
    await uploadToFTP(
      fileBuffer,
      remotePath
    )
  } catch (error) {
    console.error(
      "FTP upload failed:",
      error
    )

    return NextResponse.json(
      {
        error:
          "File upload failed. Please try again.",
      },
      {
        status: 500,
        headers: corsHeaders,
      }
    )
  }

  // ----------------------------------------
  // 10. Save metadata in MySQL
  // ----------------------------------------

  try {
    const created =
      await prisma.lesson_materials.create({
        data: {
          subject_class_id:
            data.subject_class_id,

          title: data.title,

          description:
            data.description ?? null,

          // Store the cPanel storage path.
          file_path: remotePath,

          // Store original filename for display.
          file_name: originalFileName,

          file_size: file.size,

          uploaded_by_teacher_id:
            teacherId,

          status: "active",
        },
      })

    // ----------------------------------------
    // 11. Return response
    // ----------------------------------------

    return NextResponse.json(
      {
        id: created.id,
        title: created.title,
        description: created.description,
        file_path: created.file_path,
        file_name: created.file_name,
        file_size: created.file_size,
        status: created.status,
        subject_class_id:
          created.subject_class_id,
        created_at:
          created.created_at.toISOString(),
      },
      {
        status: 201,
        headers: corsHeaders,
      }
    )
  } catch (error) {
    console.error(
      "Database insert failed:",
      error
    )

    return NextResponse.json(
      {
        error:
          "File was uploaded, but saving the database record failed.",
      },
      {
        status: 500,
        headers: corsHeaders,
      }
    )
  }
}

