import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { HOMEWORK_ATTACHMENT_POLICY, assertUploadSignature, safeUploadExtension, scanFileForViruses } from "@/lib/file-security";
import { requireStudentMobileUser, StudentMobileAuthError } from "@/lib/student-mobile-auth";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, rateLimitKey, rateLimitResponse } from "@/lib/rate-limit";
import { uploadDiskPath, uploadPublicUrl } from "@/lib/upload-storage";
import { writeSecurityAudit } from "@/lib/security-audit";

type RouteContext = { params: Promise<{ homeworkId: string }> };

export async function POST(request: Request, context: RouteContext) {
  try {
    const { homeworkId } = await context.params;
    const { studentId } = await requireStudentMobileUser(request);
    const limit = checkRateLimit({ key: rateLimitKey(request, "student-homework-attachment", studentId), limit: 20, windowMs: 60 * 60 * 1000 });
    if (!limit.ok) return rateLimitResponse(limit.resetAt);

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

    const extension = safeUploadExtension(file, HOMEWORK_ATTACHMENT_POLICY);
    const bytes = Buffer.from(await file.arrayBuffer());
    assertUploadSignature(file, bytes);
    const scan = await scanFileForViruses();
    if (!scan.clean) {
      await writeSecurityAudit({
        instituteId: submission.instituteId,
        action: "HOMEWORK_ATTACHMENT_BLOCKED",
        resourceType: "HomeworkSubmission",
        resourceId: submission.id,
        success: false,
        message: "Homework attachment failed malware scan.",
        request,
        metadata: { homeworkId, studentId, fileName: file.name, fileType: file.type, fileSize: file.size }
      });
      return NextResponse.json({ ok: false, message: "The selected file could not be accepted." }, { status: 415 });
    }

    const uploadDir = uploadDiskPath("homework-submissions", homeworkId, studentId);
    await mkdir(uploadDir, { recursive: true });

    const filename = `${randomUUID()}${extension}`;
    const diskPath = path.join(uploadDir, filename);

    await writeFile(diskPath, bytes, { flag: "wx" });

    const publicPath = uploadPublicUrl("homework-submissions", homeworkId, studentId, filename);

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
