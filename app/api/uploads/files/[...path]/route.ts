import { readFile } from "node:fs/promises";
import path from "node:path";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { contentTypeForPath } from "@/lib/file-security";
import { prisma } from "@/lib/prisma";
import { canAccess } from "@/lib/rbac";
import { writeSecurityAudit } from "@/lib/security-audit";
import { requireStudentMobileUser, StudentMobileAuthError } from "@/lib/student-mobile-auth";
import { uploadDiskPath } from "@/lib/upload-storage";

type RouteContext = { params: Promise<{ path: string[] }> };

const PUBLIC_UPLOAD_FOLDERS = new Set(["images"]);
const AUTHORIZED_UPLOAD_FOLDERS = new Set(["homework", "homework-submissions"]);

function isSafePath(segments: string[]) {
  return segments.length > 1 && segments.every((segment) => segment && segment !== "." && segment !== ".." && !segment.includes("\\"));
}

async function authorizedForHomework(request: Request, segments: string[]) {
  const [folder, homeworkId, maybeStudentId] = segments;
  if (!homeworkId) return false;

  const session = await getServerSession(authOptions);
  if (session?.user?.id) {
    if (folder === "homework") {
      const homework = await prisma.homework.findUnique({ where: { id: homeworkId }, select: { instituteId: true, classGroupId: true } });
      if (!homework) return false;
      if (session.user.instituteId === homework.instituteId && canAccess(session.user.role, "homework")) return true;
      if (session.user.role === "STUDENT") {
        return Boolean(
          await prisma.homeworkSubmission.findFirst({
            where: { homeworkId, student: { userId: session.user.id }, instituteId: homework.instituteId },
            select: { id: true }
          })
        );
      }
    }

    if (folder === "homework-submissions" && maybeStudentId) {
      const submission = await prisma.homeworkSubmission.findUnique({
        where: { homeworkId_studentId: { homeworkId, studentId: maybeStudentId } },
        select: { instituteId: true, student: { select: { userId: true } } }
      });
      if (!submission) return false;
      if (session.user.instituteId === submission.instituteId && canAccess(session.user.role, "homework")) return true;
      return session.user.role === "STUDENT" && submission.student.userId === session.user.id;
    }
  }

  try {
    const mobile = await requireStudentMobileUser(request);
    if (folder === "homework") {
      return Boolean(await prisma.homeworkSubmission.findFirst({ where: { homeworkId, studentId: mobile.studentId }, select: { id: true } }));
    }
    if (folder === "homework-submissions" && maybeStudentId) {
      return mobile.studentId === maybeStudentId;
    }
  } catch (error) {
    if (!(error instanceof StudentMobileAuthError)) throw error;
  }

  await writeSecurityAudit({
    action: "UPLOAD_FILE_ACCESS_DENIED",
    resourceType: folder ?? "upload",
    resourceId: homeworkId,
    success: false,
    message: "Unauthorized upload file access attempt.",
    request,
    metadata: { path: segments.join("/") }
  });
  return false;
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const params = await context.params;
    const folder = params.path[0] ?? "";
    if (!isSafePath(params.path) || (!PUBLIC_UPLOAD_FOLDERS.has(folder) && !AUTHORIZED_UPLOAD_FOLDERS.has(folder))) {
      return NextResponse.json({ message: "File not found." }, { status: 404 });
    }

    if (AUTHORIZED_UPLOAD_FOLDERS.has(folder) && !(await authorizedForHomework(request, params.path))) {
      return NextResponse.json({ message: "File not found." }, { status: 404 });
    }

    const relativePath = params.path.join("/");
    const filePath = uploadDiskPath(relativePath);
    const type = contentTypeForPath(filePath);
    if (!type) {
      return NextResponse.json({ message: "File not found." }, { status: 404 });
    }

    const file = await readFile(filePath);
    const download = new URL(request.url).searchParams.get("download") === "1";
    const safeName = path.basename(filePath).replace(/["\r\n]/g, "_");

    return new NextResponse(file, {
      headers: {
        "Content-Type": type,
        "Content-Length": String(file.byteLength),
        "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${safeName}"`,
        "Cache-Control": PUBLIC_UPLOAD_FOLDERS.has(folder) ? "public, max-age=31536000, immutable" : "private, no-store",
        "X-Content-Type-Options": "nosniff"
      }
    });
  } catch {
    return NextResponse.json({ message: "File not found." }, { status: 404 });
  }
}
