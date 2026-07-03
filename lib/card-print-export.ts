import { randomBytes } from "node:crypto";
import ExcelJS from "exceljs";
import JSZip from "jszip";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import QRCode from "qrcode";
import { CardPrintBatchStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type CardPrintExportFormat = "xlsx" | "csv" | "zip" | "pdf" | "json";

export type GenerateCardPrintBatchInput = {
  title?: string;
  notes?: string;
  studentIds: string[];
  prefix?: string;
  cardNumberMode?: "AUTO" | "MANUAL";
  manualCardNumbers?: Record<string, string>;
};

const cardExportRoles = ["SUPER_ADMIN", "INSTITUTE_ADMIN", "BRANCH_ADMIN", "TEACHER", "STAFF"];

export function canManageCardPrintExport(role?: string) {
  return Boolean(role && cardExportRoles.includes(role));
}

export function appBaseUrl() {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    process.env.NEXTAUTH_URL ||
    "http://localhost:3000"
  ).replace(/\/$/, "");
}

export function qrPayloadForToken(qrToken: string) {
  return `${appBaseUrl()}/card/verify/${qrToken}`;
}

export function qrImageUrlForToken(qrToken: string) {
  return `${appBaseUrl()}/api/card-print-export/qr/${qrToken}`;
}

export function sanitizeFilename(value: string) {
  return value
    .trim()
    .replace(/[^a-z0-9_-]+/gi, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80) || "student";
}

export async function qrPngBuffer(qrToken: string) {
  return QRCode.toBuffer(qrPayloadForToken(qrToken), {
    type: "png",
    errorCorrectionLevel: "M",
    margin: 2,
    width: 512,
    color: { dark: "#111827", light: "#ffffff" }
  });
}

function secureQrToken() {
  return `EDUTAP-${randomBytes(24).toString("base64url")}`;
}

async function uniqueQrToken(tx: Prisma.TransactionClient, instituteId: string) {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const token = secureQrToken();
    const existing = await tx.studentCard.findFirst({ where: { instituteId, qrToken: token }, select: { id: true } });
    if (!existing) return token;
  }

  throw new Error("Could not generate a unique QR token. Please try again.");
}

async function nextBatchNumber(tx: Prisma.TransactionClient, instituteId: string) {
  const year = new Date().getFullYear();
  const prefix = `CPB-${year}-`;
  const count = await tx.cardPrintBatch.count({ where: { instituteId, batchNumber: { startsWith: prefix } } });
  return `${prefix}${String(count + 1).padStart(4, "0")}`;
}

async function nextCardNumber(tx: Prisma.TransactionClient, instituteId: string, prefix: string, offset: number) {
  const cleanPrefix = (prefix.trim() || "EDU").toUpperCase().replace(/[^A-Z0-9-]/g, "");
  const existingCount = await tx.studentCard.count({ where: { instituteId, cardNumber: { startsWith: `${cleanPrefix}-` } } });
  return `${cleanPrefix}-${String(existingCount + offset + 1).padStart(6, "0")}`;
}

function studentFullName(student: { firstName: string; lastName: string }) {
  return `${student.firstName} ${student.lastName}`.trim();
}

export async function generateCardPrintBatch(
  instituteId: string,
  exportedById: string,
  input: GenerateCardPrintBatchInput
) {
  const selectedIds = Array.from(new Set(input.studentIds.filter(Boolean)));
  if (!selectedIds.length) {
    throw new Error("Select at least one student for card print export.");
  }

  return prisma.$transaction(async (tx) => {
    const students = await tx.student.findMany({
      where: { instituteId, id: { in: selectedIds } },
      include: {
        cards: { orderBy: { issuedAt: "desc" }, take: 1 }
      }
    });

    if (students.length !== selectedIds.length) {
      throw new Error("Some selected students could not be found for this institute.");
    }

    const batch = await tx.cardPrintBatch.create({
      data: {
        instituteId,
        batchNumber: await nextBatchNumber(tx, instituteId),
        title: input.title?.trim() || `Card print batch - ${new Date().toLocaleDateString()}`,
        status: "DRAFT",
        studentCount: students.length,
        exportedById,
        notes: input.notes?.trim() || null
      }
    });

    let autoOffset = 0;
    for (const student of students) {
      const existingCard = student.cards[0];
      const qrToken = existingCard?.qrToken || (await uniqueQrToken(tx, instituteId));
      const manualCardNumber = input.manualCardNumbers?.[student.id]?.trim();
      const cardNumber =
        input.cardNumberMode === "MANUAL"
          ? manualCardNumber || existingCard?.cardNumber || null
          : existingCard?.cardNumber || (await nextCardNumber(tx, instituteId, input.prefix || "EDU", autoOffset++));

      const card = existingCard
        ? await tx.studentCard.update({
            where: { id: existingCard.id },
            data: {
              cardNumber,
              qrToken,
              qrCode: qrPayloadForToken(qrToken),
              status: existingCard.status === "ACTIVE" ? "ACTIVE" : "PRINT_PENDING"
            }
          })
        : await tx.studentCard.create({
            data: {
              instituteId,
              studentId: student.id,
              cardNumber,
              qrToken,
              qrCode: qrPayloadForToken(qrToken),
              status: "PRINT_PENDING",
              issuedById: exportedById,
              notes: `Created by card print batch ${batch.batchNumber}.`
            }
          });

      await tx.cardPrintBatchItem.create({
        data: {
          instituteId,
          batchId: batch.id,
          studentId: student.id,
          studentCardId: card.id,
          studentName: studentFullName(student),
          studentIdNumber: student.admissionNo,
          cardNumber: card.cardNumber,
          qrToken,
          qrImageUrl: qrImageUrlForToken(qrToken),
          status: card.status === "ACTIVE" ? "ACTIVE" : "PRINT_PENDING"
        }
      });
    }

    return tx.cardPrintBatch.findUniqueOrThrow({
      where: { id: batch.id },
      include: { items: { orderBy: { studentName: "asc" } } }
    });
  });
}

export async function updateCardPrintBatchStatus(instituteId: string, batchId: string, status: CardPrintBatchStatus) {
  const existing = await prisma.cardPrintBatch.findFirst({ where: { id: batchId, instituteId }, select: { id: true } });
  if (!existing) {
    throw new Error("Card print batch was not found.");
  }

  const exportedAt = status === "EXPORTED" || status === "SENT_TO_PRINT" ? new Date() : undefined;
  return prisma.cardPrintBatch.update({
    where: { id: batchId },
    data: { status, exportedAt }
  });
}

export async function getCardPrintBatchForExport(instituteId: string, batchId: string) {
  return prisma.cardPrintBatch.findFirstOrThrow({
    where: { id: batchId, instituteId },
    include: {
      institute: { select: { name: true, logoUrl: true, phone: true } },
      items: {
        orderBy: { studentName: "asc" },
        include: {
          student: {
            include: {
              parents: { take: 1 },
              enrollments: {
                where: { active: true },
                take: 1,
                include: { classGroup: { include: { gradeLevel: true, subject: true } } }
              }
            }
          }
        }
      }
    }
  });
}

type ExportBatch = Awaited<ReturnType<typeof getCardPrintBatchForExport>>;

export function rowsForBatch(batch: ExportBatch) {
  return batch.items.map((item) => {
    const parent = item.student.parents[0];
    const classGroup = item.student.enrollments[0]?.classGroup;
    return {
      studentId: item.studentIdNumber,
      studentName: item.studentName,
      grade: classGroup?.gradeLevel?.name ?? "",
      className: classGroup?.name ?? "",
      subject: classGroup?.subject?.name ?? "",
      parentMobile: parent?.phone ?? item.student.phone ?? "",
      teacherInstituteName: batch.institute.name,
      cardNumber: item.cardNumber ?? "",
      qrToken: item.qrToken,
      qrPayload: qrPayloadForToken(item.qrToken),
      qrImageUrl: item.qrImageUrl ?? qrImageUrlForToken(item.qrToken),
      studentPhoto: item.student.avatarUrl ?? "",
      emergencyContact: parent?.emergencyContactNumber ?? parent?.phone ?? ""
    };
  });
}

export async function buildCsvExport(batch: ExportBatch) {
  const headers = [
    "Student ID",
    "Student Name",
    "Grade",
    "Class",
    "Subject",
    "Parent Mobile",
    "Teacher/Institute",
    "Card Number",
    "QR Token",
    "QR Payload",
    "QR Image URL",
    "Student Photo",
    "Emergency Contact"
  ];
  const escape = (value: string) => `"${value.replace(/"/g, '""')}"`;
  const lines = [headers.map(escape).join(",")];
  for (const row of rowsForBatch(batch)) {
    lines.push([
      row.studentId,
      row.studentName,
      row.grade,
      row.className,
      row.subject,
      row.parentMobile,
      row.teacherInstituteName,
      row.cardNumber,
      row.qrToken,
      row.qrPayload,
      row.qrImageUrl,
      row.studentPhoto,
      row.emergencyContact
    ].map(escape).join(","));
  }
  return Buffer.from(lines.join("\n"), "utf8");
}

export async function buildExcelExport(batch: ExportBatch) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "EduTap";
  const sheet = workbook.addWorksheet("Card Print Export");
  sheet.columns = [
    { header: "Student ID", key: "studentId", width: 18 },
    { header: "Student Name", key: "studentName", width: 28 },
    { header: "Grade", key: "grade", width: 14 },
    { header: "Class", key: "className", width: 24 },
    { header: "Subject", key: "subject", width: 18 },
    { header: "Parent Mobile", key: "parentMobile", width: 18 },
    { header: "Card Number", key: "cardNumber", width: 18 },
    { header: "QR Token", key: "qrToken", width: 38 },
    { header: "QR Image URL", key: "qrImageUrl", width: 48 },
    { header: "QR Payload", key: "qrPayload", width: 48 },
    { header: "Student Photo", key: "studentPhoto", width: 32 },
    { header: "Emergency Contact", key: "emergencyContact", width: 20 }
  ];
  sheet.addRows(rowsForBatch(batch));
  sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  sheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F766E" } };
  sheet.views = [{ state: "frozen", ySplit: 1 }];
  return Buffer.from(await workbook.xlsx.writeBuffer());
}

export async function buildZipExport(batch: ExportBatch) {
  const zip = new JSZip();
  for (const row of rowsForBatch(batch)) {
    const png = await qrPngBuffer(row.qrToken);
    zip.file(`${sanitizeFilename(row.studentId)}_${sanitizeFilename(row.studentName)}_QR.png`, png);
  }
  return zip.generateAsync({ type: "nodebuffer" });
}

export async function buildPdfExport(batch: ExportBatch) {
  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const rows = rowsForBatch(batch);
  const pageWidth = 595.28;
  const pageHeight = 841.89;
  const margin = 28;
  const gap = 12;
  const cardWidth = (pageWidth - margin * 2 - gap) / 2;
  const cardHeight = 142;
  let page = pdf.addPage([pageWidth, pageHeight]);
  let indexOnPage = 0;

  for (const row of rows) {
    if (indexOnPage >= 10) {
      page = pdf.addPage([pageWidth, pageHeight]);
      indexOnPage = 0;
    }
    const col = indexOnPage % 2;
    const rowIndex = Math.floor(indexOnPage / 2);
    const x = margin + col * (cardWidth + gap);
    const y = pageHeight - margin - (rowIndex + 1) * cardHeight - rowIndex * gap;
    const qrImage = await pdf.embedPng(await qrPngBuffer(row.qrToken));

    page.drawRectangle({ x, y, width: cardWidth, height: cardHeight, borderColor: rgb(0.13, 0.21, 0.25), borderWidth: 0.8, color: rgb(0.98, 1, 0.99) });
    page.drawText(batch.institute.name, { x: x + 12, y: y + cardHeight - 22, size: 9, font: bold, color: rgb(0.05, 0.32, 0.3) });
    page.drawText(row.studentName.slice(0, 32), { x: x + 12, y: y + cardHeight - 46, size: 13, font: bold, color: rgb(0.06, 0.09, 0.16) });
    page.drawText(`ID: ${row.studentId}`, { x: x + 12, y: y + cardHeight - 64, size: 9, font: regular, color: rgb(0.22, 0.28, 0.35) });
    page.drawText(`Grade: ${row.grade || "-"}`, { x: x + 12, y: y + cardHeight - 82, size: 8, font: regular, color: rgb(0.22, 0.28, 0.35) });
    page.drawText(`Class: ${(row.className || row.subject || "-").slice(0, 30)}`, { x: x + 12, y: y + cardHeight - 98, size: 8, font: regular, color: rgb(0.22, 0.28, 0.35) });
    page.drawText(row.cardNumber || "Card pending", { x: x + 12, y: y + 16, size: 9, font: bold, color: rgb(0.05, 0.32, 0.3) });
    page.drawImage(qrImage, { x: x + cardWidth - 104, y: y + 22, width: 82, height: 82 });
    indexOnPage += 1;
  }

  return Buffer.from(await pdf.save());
}
