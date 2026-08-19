import fs from "node:fs/promises";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { uploadPublicUrl } from "@/lib/upload-storage";

const prisma = new PrismaClient();

async function main() {
  const instituteSlug = process.env.IMPORT_INSTITUTE_SLUG ?? "edutap-demo";
  const institute = await prisma.institute.findUnique({ where: { slug: instituteSlug }, select: { id: true, name: true } });
  if (!institute) throw new Error(`Institute slug "${instituteSlug}" was not found.`);

  const photoDir = path.join(process.cwd(), "public", "uploads", "student-photos");
  const files = await fs.readdir(photoDir).catch(() => []);
  const photoByAdmission = new Map<string, string>();

  for (const file of files) {
    const match = file.match(/^(eea-\d{4})-/i);
    if (!match) continue;
    photoByAdmission.set(match[1].toUpperCase(), uploadPublicUrl("student-photos", file));
  }

  const students = await prisma.student.findMany({
    where: { instituteId: institute.id },
    select: { id: true, admissionNo: true, userId: true },
    orderBy: { admissionNo: "asc" }
  });

  let assigned = 0;
  const missing: string[] = [];

  for (const student of students) {
    const avatarUrl = photoByAdmission.get(student.admissionNo.toUpperCase());
    if (!avatarUrl) {
      missing.push(student.admissionNo);
      continue;
    }

    await prisma.student.update({ where: { id: student.id }, data: { avatarUrl } });
    if (student.userId) {
      await prisma.user.update({ where: { id: student.userId }, data: { image: avatarUrl } });
    }
    assigned += 1;
  }

  console.log(`Assigned ${assigned} local student photos for ${institute.name}.`);
  if (missing.length) console.log(`Missing photos: ${missing.join(", ")}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
