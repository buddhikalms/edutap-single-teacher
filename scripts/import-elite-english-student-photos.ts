import fs from "node:fs/promises";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { uploadDiskPath, uploadPublicUrl } from "@/lib/upload-storage";

const prisma = new PrismaClient();
const SHEET_ID = "1yusMytIX1rt3Trs7c6_aZEruG3PlWzvoUaoOFDObHok";
const SHEET_CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv`;
const DEFAULT_LOCAL_CSV = "E:\\Downloads 2\\Elite_English_Academy_Student_Registration_Organized.xlsx - All Students.csv";

type SheetRow = {
  "First Name": string;
  "Last Name": string;
  "Student Photo": string;
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

function driveFileId(url: string) {
  return url.match(/[?&]id=([^&]+)/)?.[1] ?? url.match(/\/d\/([^/]+)/)?.[1] ?? null;
}

function extensionFor(contentType: string) {
  if (contentType.includes("png")) return "png";
  if (contentType.includes("webp")) return "webp";
  if (contentType.includes("gif")) return "gif";
  return "jpg";
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

async function downloadPhoto(fileId: string, rowNumber: number) {
  const response = await fetch(`https://drive.google.com/uc?export=download&id=${fileId}`, { redirect: "follow" });
  const contentType = response.headers.get("content-type") ?? "";

  if (!response.ok || !contentType.startsWith("image/")) {
    throw new Error(`Google Drive returned ${response.status} ${contentType || "unknown type"} for row ${rowNumber}.`);
  }

  const ext = extensionFor(contentType);
  const fileName = `eea-${String(rowNumber).padStart(4, "0")}-${fileId}.${ext}`;
  const diskPath = uploadDiskPath("student-photos", fileName);
  await fs.mkdir(path.dirname(diskPath), { recursive: true });
  await fs.writeFile(diskPath, Buffer.from(await response.arrayBuffer()));
  return uploadPublicUrl("student-photos", fileName);
}

async function main() {
  const instituteSlug = process.env.IMPORT_INSTITUTE_SLUG ?? "edutap-demo";
  const institute = await prisma.institute.findUnique({ where: { slug: instituteSlug }, select: { id: true, name: true } });
  if (!institute) throw new Error(`Institute slug "${instituteSlug}" was not found.`);

  const rows = parseCsv(await sourceCsvText()).filter((row) => row["First Name"] || row["Last Name"]);
  let assigned = 0;
  let skipped = 0;

  for (const [index, row] of rows.entries()) {
    const rowNumber = index + 1;
    const fileId = driveFileId(row["Student Photo"]);
    if (!fileId) {
      skipped += 1;
      console.warn(`Skipped row ${rowNumber}: no Drive file ID.`);
      continue;
    }

    try {
      const avatarUrl = await downloadPhoto(fileId, rowNumber);
      const admissionNo = `EEA-${String(rowNumber).padStart(4, "0")}`;
      const student = await prisma.student.updateMany({
        where: { instituteId: institute.id, admissionNo },
        data: { avatarUrl }
      });

      await prisma.user.updateMany({
        where: { instituteId: institute.id, student: { admissionNo } },
        data: { image: avatarUrl }
      });

      if (student.count > 0) assigned += 1;
      else skipped += 1;
    } catch (error) {
      skipped += 1;
      console.warn(error instanceof Error ? error.message : `Skipped row ${rowNumber}: unknown error.`);
    }
  }

  console.log(`Photo assignment complete for ${institute.name}. Assigned: ${assigned}. Skipped: ${skipped}.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
