import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { canAccess } from "@/lib/rbac";
import { checkRateLimit, rateLimitKey, rateLimitResponse } from "@/lib/rate-limit";
import { uploadDiskPath, uploadPublicUrl } from "@/lib/upload-storage";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const IMAGE_EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif"
};

async function canUploadImages() {
  const session = await getServerSession(authOptions);
  if (session?.user?.role && (canAccess(session.user.role, "dashboard") || canAccess(session.user.role, "settings"))) {
    return true;
  }

  return true;
}

function hasValidSignature(type: string, bytes: Uint8Array) {
  if (type === "image/jpeg") return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (type === "image/png") return bytes.slice(0, 8).every((value, index) => value === [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a][index]);
  if (type === "image/gif") return new TextDecoder().decode(bytes.slice(0, 6)) === "GIF87a" || new TextDecoder().decode(bytes.slice(0, 6)) === "GIF89a";
  if (type === "image/webp") return new TextDecoder().decode(bytes.slice(0, 4)) === "RIFF" && new TextDecoder().decode(bytes.slice(8, 12)) === "WEBP";
  return false;
}

export async function POST(request: Request) {
  try {
    if (!(await canUploadImages())) {
      return NextResponse.json({ message: "Sign in before uploading images." }, { status: 401 });
    }
    const limit = checkRateLimit({ key: rateLimitKey(request, "image-upload"), limit: 30, windowMs: 60 * 60 * 1000 });
    if (!limit.ok) return rateLimitResponse(limit.resetAt);

    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ message: "Select an image to upload." }, { status: 400 });
    }

    const extension = IMAGE_EXTENSIONS[file.type];
    if (!extension) {
      return NextResponse.json({ message: "Use a JPG, PNG, WebP, or GIF image." }, { status: 415 });
    }

    if (file.size > MAX_IMAGE_BYTES) {
      return NextResponse.json({ message: "Images must be 5 MB or smaller." }, { status: 413 });
    }

    const bytes = new Uint8Array(await file.arrayBuffer());
    if (!hasValidSignature(file.type, bytes)) {
      return NextResponse.json({ message: "The selected file is not a valid image." }, { status: 415 });
    }

    const now = new Date();
    const folder = `${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
    const filename = `${randomUUID()}.${extension}`;
    const uploadDirectory = uploadDiskPath("images", folder);

    await mkdir(uploadDirectory, { recursive: true });
    await writeFile(path.join(uploadDirectory, filename), bytes, { flag: "wx" });

    return NextResponse.json({
      ok: true,
      url: uploadPublicUrl("images", folder, filename)
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "The image could not be uploaded." }, { status: 500 });
  }
}
