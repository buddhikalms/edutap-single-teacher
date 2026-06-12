import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { requireStudentMobileUser, StudentMobileAuthError } from "@/lib/student-mobile-auth";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ homeworkId: string }> };

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const UPLOAD_ROOT = path.join(process.cwd(), "public", "uploads", "homework-submissions");

function extensionFor(file: File) {
  const fromName = path.extname(file.name).toLowerCase();
  if (fromName && /^[a-z0-9.]+$/.test(fromName)) return fromName.slice(0, 20);

  if (file.type === "application/pdf") return ".pdf";
  if (file.type === "image/jpeg") return ".jpg";
  if (file.type === "image/png") return ".png";
  if (file.type === "image/webp") return ".webp";

  return ".bin";
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { homeworkId } = await context.params;
    const { studentId } = await requireStudentMobileUser(request);

    const submission = await prisma.homeworkSubmission.findFirst({
      where: { homeworkId, studentId },
      include: { homework: { select: { status: true } } }
    });

    if (!submission || submission.homework.status !== "PUBLISHED") {
      return NextResponse.json({ ok: false, message: "Homework is not available for upload." }, { status: 404 });
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ ok: false, message: "Select a file to upload." }, { status: 400 });
    }

    if (file.size <= 0) {
      return NextResponse.json({ ok: false, message: "The selected file is empty." }, { status: 400 });
    }

    if (file.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json({ ok: false, message: "Uploads must be 10 MB or smaller." }, { status: 413 });
    }

    const uploadDir = path.join(UPLOAD_ROOT, homeworkId);
    await mkdir(uploadDir, { recursive: true });

    const filename = `${randomUUID()}${extensionFor(file)}`;
    const diskPath = path.join(uploadDir, filename);
    const bytes = Buffer.from(await file.arrayBuffer());

    await writeFile(diskPath, bytes);

    const publicPath = `/uploads/homework-submissions/${homeworkId}/${filename}`;

    return NextResponse.json({
      ok: true,
      url: new URL(publicPath, request.url).toString(),
      name: file.name || filename,
      size: file.size
    });
  } catch (error) {
    if (error instanceof StudentMobileAuthError) return NextResponse.json({ ok: false, message: error.message }, { status: error.statusCode });
    console.error(error);
    return NextResponse.json({ ok: false, message: "Could not upload homework attachment." }, { status: 500 });
  }
}
