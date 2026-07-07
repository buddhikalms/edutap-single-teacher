import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { uploadDiskPath } from "@/lib/upload-storage";

type RouteContext = { params: Promise<{ path: string[] }> };

const CONTENT_TYPES: Record<string, string> = {
  ".gif": "image/gif",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".pdf": "application/pdf",
  ".png": "image/png",
  ".webp": "image/webp",
  ".doc": "application/msword",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".xls": "application/vnd.ms-excel",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".ppt": "application/vnd.ms-powerpoint",
  ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ".txt": "text/plain",
  ".zip": "application/zip",
  ".mp4": "video/mp4",
  ".mov": "video/quicktime"
};

const PUBLIC_UPLOAD_FOLDERS = new Set(["homework", "homework-submissions", "images"]);
const BLOCKED_EXTENSIONS = new Set([
  ".bat",
  ".cmd",
  ".com",
  ".cpl",
  ".exe",
  ".hta",
  ".jar",
  ".js",
  ".jse",
  ".msi",
  ".ps1",
  ".scr",
  ".sh",
  ".vbs",
  ".wsf"
]);

function isSafePath(segments: string[]) {
  return segments.length > 1 && segments.every((segment) => segment && segment !== "." && segment !== ".." && !segment.includes("\\"));
}

export async function GET(_: Request, context: RouteContext) {
  try {
    const params = await context.params;
    if (!isSafePath(params.path) || !PUBLIC_UPLOAD_FOLDERS.has(params.path[0] ?? "")) {
      return NextResponse.json({ message: "File not found." }, { status: 404 });
    }

    const relativePath = params.path.join("/");
    const filePath = uploadDiskPath(relativePath);
    const extension = path.extname(filePath).toLowerCase();
    const type = CONTENT_TYPES[extension];
    if (!type || BLOCKED_EXTENSIONS.has(extension)) {
      return NextResponse.json({ message: "File not found." }, { status: 404 });
    }

    const file = await readFile(filePath);

    return new NextResponse(file, {
      headers: {
        "Content-Type": type,
        "Content-Length": String(file.byteLength),
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff"
      }
    });
  } catch {
    return NextResponse.json({ message: "File not found." }, { status: 404 });
  }
}
