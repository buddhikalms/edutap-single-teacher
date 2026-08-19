import fs from "node:fs/promises";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { encryptEmbedding } from "@/lib/biometric-encryption";
import { enrolFaceTemplate } from "@/lib/face-recognition-client";

const prisma = new PrismaClient();

if (!process.env.FACE_SERVICE_INTERNAL_URL || process.env.FACE_SERVICE_INTERNAL_URL.includes("face-service")) {
  process.env.FACE_SERVICE_INTERNAL_URL = process.env.IMPORT_FACE_SERVICE_URL ?? "http://localhost:8000";
}

const PHOTO_DIR = path.join(process.cwd(), "public", "uploads", "student-photos");
const POLICY_VERSION = "2026-07-face-attendance-v1";

async function loadLocalEnv() {
  const text = await fs.readFile(path.join(process.cwd(), ".env"), "utf8").catch(() => "");
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!match || process.env[match[1]]) continue;
    process.env[match[1]] = match[2].trim().replace(/^"|"$/g, "");
  }
}

function mimeType(file: string) {
  const ext = path.extname(file).toLowerCase();
  if (ext === ".png") return "image/png";
  if (ext === ".webp") return "image/webp";
  if (ext === ".gif") return "image/gif";
  return "image/jpeg";
}

async function imageDataUrl(file: string) {
  const bytes = await fs.readFile(path.join(PHOTO_DIR, file));
  return `data:${mimeType(file)};base64,${bytes.toString("base64")}`;
}

async function main() {
  await loadLocalEnv();
  if (!process.env.FACE_SERVICE_INTERNAL_URL || process.env.FACE_SERVICE_INTERNAL_URL.includes("face-service")) {
    process.env.FACE_SERVICE_INTERNAL_URL = process.env.IMPORT_FACE_SERVICE_URL ?? "http://127.0.0.1:8000";
  }

  const instituteSlug = process.env.IMPORT_INSTITUTE_SLUG ?? "edutap-demo";
  const institute = await prisma.institute.findUnique({ where: { slug: instituteSlug }, select: { id: true, name: true } });
  if (!institute) throw new Error(`Institute slug "${instituteSlug}" was not found.`);

  const admin = await prisma.user.findFirst({
    where: { instituteId: institute.id, role: { in: ["INSTITUTE_ADMIN", "SUPER_ADMIN", "TEACHER", "STAFF"] } },
    orderBy: { createdAt: "asc" },
    select: { id: true }
  });

  const students = await prisma.student.findMany({
    where: { instituteId: institute.id },
    select: { id: true, admissionNo: true, firstName: true, lastName: true, userId: true },
    orderBy: { admissionNo: "asc" }
  });
  const files = await fs.readdir(PHOTO_DIR).catch(() => []);
  const photoByAdmission = new Map<string, string>();
  for (const file of files) {
    const match = file.match(/^(eea-\d{4})-/i);
    if (match) photoByAdmission.set(match[1].toUpperCase(), file);
  }

  await prisma.instituteSettings.upsert({
    where: { instituteId: institute.id },
    create: {
      instituteId: institute.id,
      faceAttendanceEnabled: true,
      faceAllowStudentSelfEnrollment: true,
      faceRequireParentConsent: false,
      faceFallbackMethods: ["QR", "NFC", "MANUAL"]
    },
    update: {
      faceAttendanceEnabled: true,
      faceAllowStudentSelfEnrollment: true,
      faceRequireParentConsent: false,
      faceFallbackMethods: ["QR", "NFC", "MANUAL"]
    }
  });

  let enrolled = 0;
  let failed = 0;
  const missing: string[] = [];

  for (const student of students) {
    const file = photoByAdmission.get(student.admissionNo.toUpperCase());
    if (!file) {
      missing.push(`${student.admissionNo} ${student.firstName} ${student.lastName}`.trim());
      continue;
    }

    try {
      const frame = await imageDataUrl(file);
      const result = await enrolFaceTemplate([frame, frame, frame, frame, frame]);
      if (!result.success || !result.embedding) {
        throw new Error(result.message ?? result.reasonCode ?? "Face sample was not accepted.");
      }

      const encrypted = encryptEmbedding(result.embedding);
      await prisma.$transaction(async (tx) => {
        await tx.biometricConsent.create({
          data: {
            studentId: student.id,
            consentType: "FACE_ATTENDANCE",
            consented: true,
            consentedById: admin?.id ?? student.userId ?? "bulk-face-import",
            policyVersion: POLICY_VERSION,
            consentedAt: new Date()
          }
        });

        await tx.studentFaceProfile.upsert({
          where: { studentId: student.id },
          create: {
            studentId: student.id,
            status: "ACTIVE",
            ...encrypted,
            recognitionModel: result.model ?? "insightface",
            modelVersion: result.modelVersion ?? "configured-version",
            sampleCount: 1,
            qualityScore: result.qualityScore,
            enrolledById: admin?.id ?? student.userId
          },
          update: {
            status: "ACTIVE",
            ...encrypted,
            recognitionModel: result.model ?? "insightface",
            modelVersion: result.modelVersion ?? "configured-version",
            sampleCount: 1,
            qualityScore: result.qualityScore,
            enrolledById: admin?.id ?? student.userId,
            enrolledAt: new Date(),
            revokedAt: null,
            deletedAt: null,
            deletionRequestedAt: null
          }
        });
      });
      enrolled += 1;
    } catch (error) {
      failed += 1;
      console.warn(`${student.admissionNo}: ${error instanceof Error ? error.message : "Face enrollment failed."}`);
    }
  }

  console.log(`Face enrollment complete for ${institute.name}. Enrolled: ${enrolled}. Missing photos: ${missing.length}. Failed: ${failed}.`);
  if (missing.length) console.log(`Missing: ${missing.join(", ")}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
