import path from "node:path";

type AllowedFile = {
  extensions: string[];
  mimeTypes: string[];
  maxBytes: number;
};

export const HOMEWORK_ATTACHMENT_POLICY: AllowedFile = {
  extensions: [".jpg", ".jpeg", ".png", ".webp", ".gif", ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx", ".txt", ".zip"],
  mimeTypes: [
    "application/pdf",
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
    "text/plain",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "application/zip"
  ],
  maxBytes: 20 * 1024 * 1024
};

export const COURSE_RESOURCE_POLICY: AllowedFile = {
  extensions: [".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx", ".zip", ".png", ".jpg", ".jpeg", ".webp", ".mp4", ".mov"],
  mimeTypes: [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "application/zip",
    "image/png",
    "image/jpeg",
    "image/webp",
    "video/mp4",
    "video/quicktime"
  ],
  maxBytes: 100 * 1024 * 1024
};

export const BLOCKED_UPLOAD_EXTENSIONS = new Set([
  ".bat",
  ".cmd",
  ".com",
  ".cpl",
  ".dll",
  ".exe",
  ".hta",
  ".html",
  ".jar",
  ".js",
  ".jse",
  ".msi",
  ".php",
  ".ps1",
  ".scr",
  ".sh",
  ".svg",
  ".vbs",
  ".wsf"
]);

export const CONTENT_TYPES: Record<string, string> = {
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

function signatureMatches(type: string, bytes: Uint8Array) {
  if (type === "image/jpeg") return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (type === "image/png") return bytes.slice(0, 8).every((value, index) => value === [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a][index]);
  if (type === "image/gif") {
    const header = new TextDecoder().decode(bytes.slice(0, 6));
    return header === "GIF87a" || header === "GIF89a";
  }
  if (type === "image/webp") return new TextDecoder().decode(bytes.slice(0, 4)) === "RIFF" && new TextDecoder().decode(bytes.slice(8, 12)) === "WEBP";
  if (type === "application/pdf") return new TextDecoder().decode(bytes.slice(0, 5)) === "%PDF-";
  if (type === "application/zip") return bytes[0] === 0x50 && bytes[1] === 0x4b;
  return true;
}

export function safeUploadExtension(file: File, policy: AllowedFile) {
  const extension = path.extname(file.name).toLowerCase().replace(/[^.a-z0-9]/g, "");
  if (!extension || extension.length > 20 || BLOCKED_UPLOAD_EXTENSIONS.has(extension) || !policy.extensions.includes(extension)) {
    throw new Error("Unsupported file type.");
  }

  if (file.type && !policy.mimeTypes.includes(file.type)) {
    throw new Error("Unsupported file type.");
  }

  if (file.size <= 0) {
    throw new Error("The selected file is empty.");
  }

  if (file.size > policy.maxBytes) {
    throw new Error("The selected file is too large.");
  }

  return extension;
}

export function assertUploadSignature(file: File, bytes: Uint8Array) {
  if (file.type && !signatureMatches(file.type, bytes)) {
    throw new Error("The selected file content does not match its file type.");
  }
}

export async function scanFileForViruses() {
  // Production hook: integrate ClamAV, S3 Object Lambda, or a vendor scanner here.
  return { clean: true };
}

export function contentTypeForPath(filePath: string) {
  const extension = path.extname(filePath).toLowerCase();
  if (BLOCKED_UPLOAD_EXTENSIONS.has(extension)) return null;
  return CONTENT_TYPES[extension] ?? null;
}
