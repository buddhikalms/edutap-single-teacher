import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { uploadDiskPath, uploadPublicUrl } from "@/lib/upload-storage";

const prisma = new PrismaClient();

const SHEET_ID = "1yusMytIX1rt3Trs7c6_aZEruG3PlWzvoUaoOFDObHok";
const SHEET_CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv`;
const DEFAULT_LOCAL_CSV = "E:\\Downloads 2\\Elite_English_Academy_Student_Registration_Organized.xlsx - All Students.csv";
const DEFAULT_CLASS_TYPES = ["Individual", "Group", "Spoken"];

type SheetRow = {
  Timestamp: string;
  Grade: string;
  "Class type": string;
  "First Name": string;
  "Last Name": string;
  Email: string;
  "Phone Number": string;
  "Date of Birth": string;
  "Student Photo": string;
  "Guardian Name": string;
  "Guardian Phone": string;
  "Emergency Contact Number": string;
  "Guardian Relationship.": string;
  "Guardian NIC": string;
  "Guardian Occupation": string;
  "Parent address": string;
};

function parseCsv(text: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === "\"") {
      if (quoted && next === "\"") {
        cell += "\"";
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (char === "," && !quoted) {
      row.push(cell);
      cell = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(cell);
      if (row.some((value) => value.trim())) rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }

  row.push(cell);
  if (row.some((value) => value.trim())) rows.push(row);

  const [headers = [], ...data] = rows;
  return data.map((values) =>
    Object.fromEntries(headers.map((header, index) => [header.trim(), values[index]?.trim() ?? ""]))
  ) as SheetRow[];
}

function clean(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function validEmail(value?: string | null) {
  const email = clean(value)?.toLowerCase();
  return email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
}

function normalizeGrade(value: string) {
  const trimmed = value.trim();
  const number = trimmed.match(/\d+/)?.[0];
  if (number) return `Grade ${Number(number)}`;
  return trimmed && trimmed.toLowerCase() !== "grade" ? trimmed : "Ungraded";
}

function gradeOrder(name: string) {
  const number = name.match(/\d+/)?.[0];
  return number ? Number(number) : 999;
}

function normalizeClassType(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "Group";
  if (trimmed.toLowerCase() === "g") return "Group";
  return trimmed[0].toUpperCase() + trimmed.slice(1).toLowerCase();
}

function parseDate(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const iso = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (iso) {
    const [, year, month, day] = iso.map(Number);
    return new Date(Date.UTC(year, month - 1, day));
  }

  const [month, day, year] = trimmed.split(/[/-]/).map(Number);
  if (!month || !day || !year) return null;
  return new Date(Date.UTC(year, month - 1, day));
}

async function sourceCsvText() {
  const localPath = process.argv[2] ?? process.env.IMPORT_STUDENTS_CSV ?? DEFAULT_LOCAL_CSV;

  try {
    return await fs.readFile(localPath, "utf8");
  } catch {
    const response = await fetch(SHEET_CSV_URL);
    if (!response.ok) throw new Error(`Could not download sheet CSV: ${response.status}`);
    return response.text();
  }
}

function driveFileId(url: string) {
  return url.match(/[?&]id=([^&]+)/)?.[1] ?? url.match(/\/d\/([^/]+)/)?.[1] ?? null;
}

function extensionFor(contentType: string) {
  if (contentType.includes("png")) return "png";
  if (contentType.includes("webp")) return "webp";
  if (contentType.includes("gif")) return "gif";
  return "jpg";
}

async function downloadStudentPhoto(row: SheetRow, index: number) {
  const fileId = driveFileId(row["Student Photo"]);
  if (!fileId) return null;

  const response = await fetch(`https://drive.google.com/uc?export=download&id=${fileId}`, { redirect: "follow" });
  const contentType = response.headers.get("content-type") ?? "";
  if (!response.ok || !contentType.startsWith("image/")) {
    console.warn(`Skipped photo for row ${index + 1}: Google Drive returned ${response.status} ${contentType || "unknown type"}.`);
    return null;
  }

  const bytes = Buffer.from(await response.arrayBuffer());
  const ext = extensionFor(contentType);
  const fileName = `eea-${String(index + 1).padStart(4, "0")}-${fileId}.${ext}`;
  const diskPath = uploadDiskPath("student-photos", fileName);
  await fs.mkdir(path.dirname(diskPath), { recursive: true });
  await fs.writeFile(diskPath, bytes);
  return uploadPublicUrl("student-photos", fileName);
}

async function main() {
  const instituteSlug = process.env.IMPORT_INSTITUTE_SLUG ?? "edutap-demo";
  const rows = parseCsv(await sourceCsvText()).filter((row) => clean(row["First Name"]) || clean(row["Last Name"]));
  const imported = await Promise.all(
    rows.map(async (row, index) => ({
      row,
      grade: normalizeGrade(row.Grade),
      classType: normalizeClassType(row["Class type"]),
      avatarUrl: await downloadStudentPhoto(row, index)
    }))
  );

  const institute = await prisma.institute.findUnique({
    where: { slug: instituteSlug },
    include: { branches: { orderBy: { createdAt: "asc" }, take: 1 } }
  });
  if (!institute) throw new Error(`Institute slug "${instituteSlug}" was not found.`);
  const branch = institute.branches[0];
  if (!branch) throw new Error(`Institute "${institute.name}" has no branch.`);

  const existingStudents = await prisma.student.findMany({
    where: { instituteId: institute.id },
    select: { userId: true }
  });
  const studentUserIds = existingStudents.map((student) => student.userId).filter((id): id is string => Boolean(id));
  const parentUserIds = (
    await prisma.parent.findMany({ where: { instituteId: institute.id }, select: { userId: true } })
  ).map((parent) => parent.userId).filter((id): id is string => Boolean(id));

  await prisma.$transaction(async (tx) => {
    await tx.student.deleteMany({ where: { instituteId: institute.id } });
    await tx.parent.deleteMany({ where: { instituteId: institute.id } });
    await tx.user.deleteMany({ where: { id: { in: [...studentUserIds, ...parentUserIds] } } });
    await tx.classGroup.deleteMany({ where: { instituteId: institute.id } });

    await tx.instituteSettings.upsert({
      where: { instituteId: institute.id },
      create: { instituteId: institute.id, currency: "LKR", classTypeOptions: DEFAULT_CLASS_TYPES },
      update: { currency: "LKR", classTypeOptions: DEFAULT_CLASS_TYPES }
    });

    const subject = await tx.subject.upsert({
      where: { instituteId_name: { instituteId: institute.id, name: "English" } },
      create: { instituteId: institute.id, name: "English", color: "#0f766e", icon: "BookOpen" },
      update: { isActive: true }
    });

    const teacher = await tx.teacher.findFirst({
      where: { instituteId: institute.id, userId: { not: null } },
      orderBy: { createdAt: "asc" }
    });

    const classByKey = new Map<string, string>();

    for (const name of Array.from(new Set(imported.map((item) => item.grade)))) {
      await tx.grade.upsert({
        where: { instituteId_name: { instituteId: institute.id, name } },
        create: { instituteId: institute.id, name, order: gradeOrder(name) },
        update: { order: gradeOrder(name), isActive: true }
      });
    }

    for (const item of imported) {
      const grade = await tx.grade.findUniqueOrThrow({ where: { instituteId_name: { instituteId: institute.id, name: item.grade } } });
      const key = `${grade.id}:${item.classType}`;
      let classGroupId = classByKey.get(key);

      if (!classGroupId) {
        const code = `${item.grade.replace(/[^a-z0-9]+/gi, "").toUpperCase() || "UG"}-${item.classType.replace(/[^a-z0-9]+/gi, "").toUpperCase()}`;
        const classGroup = await tx.classGroup.upsert({
          where: { instituteId_code: { instituteId: institute.id, code } },
          create: {
            instituteId: institute.id,
            branchId: branch.id,
            gradeId: grade.id,
            subjectId: subject.id,
            teacherId: teacher?.id ?? null,
            name: `${item.grade} ${item.classType}`,
            code,
            schedule: "To be scheduled",
            classType: item.classType,
            capacity: 100,
            monthlyFee: 0
          },
          update: {
            gradeId: grade.id,
            subjectId: subject.id,
            teacherId: teacher?.id ?? null,
            classType: item.classType,
            status: "ACTIVE"
          }
        });
        classGroupId = classGroup.id;
        classByKey.set(key, classGroupId);
      }

      const row = item.row;
      const admissionNo = `EEA-${String(imported.indexOf(item) + 1).padStart(4, "0")}`;
      const loginEmail = `${admissionNo.toLowerCase()}@student.edutap.local`;
      const user = await tx.user.create({
        data: {
          name: `${row["First Name"]} ${row["Last Name"]}`.trim(),
          email: loginEmail,
          passwordHash: null,
          passwordStatus: "NOT_SETUP",
          role: "STUDENT",
          image: item.avatarUrl,
          instituteId: institute.id,
          branchId: branch.id
        }
      });

      const parent = await tx.parent.create({
        data: {
          instituteId: institute.id,
          name: clean(row["Guardian Name"]) ?? "Guardian",
          email: validEmail(row.Email),
          phone: clean(row["Guardian Phone"]) ?? clean(row["Phone Number"]) ?? "N/A",
          relationship: clean(row["Guardian Relationship."]) ?? "Guardian",
          nic: clean(row["Guardian NIC"]),
          address: clean(row["Parent address"]),
          appLoginIdentifier: clean(row["Guardian Phone"]) ?? clean(row.Email) ?? clean(row["Phone Number"]) ?? "",
          emergencyContactNumber: clean(row["Emergency Contact Number"]) ?? clean(row["Guardian Phone"]) ?? "",
          occupation: clean(row["Guardian Occupation"])
        }
      });

      const student = await tx.student.create({
        data: {
          instituteId: institute.id,
          branchId: branch.id,
          userId: user.id,
          admissionNo,
          firstName: clean(row["First Name"]) ?? "Student",
          lastName: clean(row["Last Name"]) ?? "",
          email: validEmail(row.Email),
          phone: clean(row["Phone Number"]),
          dateOfBirth: parseDate(row["Date of Birth"]),
          avatarUrl: item.avatarUrl,
          attendanceToken: randomUUID(),
          parents: { connect: { id: parent.id } }
        }
      });

      await tx.parentStudent.upsert({
        where: { parentId_studentId: { parentId: parent.id, studentId: student.id } },
        create: { parentId: parent.id, studentId: student.id, relation: parent.relationship },
        update: { relation: parent.relationship }
      });

      await tx.enrollment.create({
        data: {
          studentId: student.id,
          classGroupId,
          paymentStartDate: new Date(Date.UTC(2026, 6, 5)),
          freePeriodType: "NONE",
          freeDays: 0,
          discount: 0
        }
      });
    }
  });

  console.log(`Imported ${imported.length} students into ${institute.name}.`);
  console.log(`Class types: ${DEFAULT_CLASS_TYPES.join(", ")}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
