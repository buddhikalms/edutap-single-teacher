import path from "node:path";

const uploadRootEnv = process.env.EDUTAP_UPLOAD_DIR || process.env.UPLOAD_ROOT_DIR || process.env.UPLOAD_DIR;

function defaultPublicUploadRoot() {
  return path.join(/* turbopackIgnore: true */ process.cwd(), "public", "uploads");
}

export function uploadStorageRoot() {
  return path.resolve(uploadRootEnv || defaultPublicUploadRoot());
}

export function usesPublicUploadRoot() {
  return !uploadRootEnv;
}

function cleanSegment(segment: string) {
  const clean = segment.replaceAll("\\", "/").replace(/^\/+|\/+$/g, "");
  if (!clean || clean === "." || clean === ".." || clean.includes("../") || path.isAbsolute(clean)) {
    throw new Error("Invalid upload path.");
  }
  return clean;
}

export function uploadDiskPath(...segments: string[]) {
  const root = uploadStorageRoot();
  const relativePath = segments.map(cleanSegment).join("/");
  const resolved = path.resolve(root, relativePath);
  if (resolved !== root && !resolved.startsWith(`${root}${path.sep}`)) {
    throw new Error("Invalid upload path.");
  }
  return resolved;
}

export function uploadPublicUrl(...segments: string[]) {
  const relativePath = segments.map(cleanSegment).join("/");
  return usesPublicUploadRoot() ? `/uploads/${relativePath}` : `/api/uploads/files/${relativePath}`;
}
