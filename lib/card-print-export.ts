import { randomBytes } from "node:crypto";
import ExcelJS from "exceljs";
import JSZip from "jszip";
import { PDFDocument, rgb, StandardFonts, type PDFFont, type PDFImage, type PDFPage } from "pdf-lib";
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
  const marginX = 56;
  const marginY = 43;
  const gapX = 12;
  const gapY = 12;
  const cardWidth = 153;
  const cardHeight = 243;
  const cardsPerSheet = 9;

  for (let offset = 0; offset < rows.length; offset += cardsPerSheet) {
    const sheetRows = rows.slice(offset, offset + cardsPerSheet);
    const qrImages = await Promise.all(sheetRows.map(async (row) => pdf.embedPng(await qrPngBuffer(row.qrToken))));
    const frontPage = pdf.addPage([pageWidth, pageHeight]);
    const backPage = pdf.addPage([pageWidth, pageHeight]);
    drawSheetLabel(frontPage, `FRONT • ${batch.batchNumber}`, regular, pageHeight);
    drawSheetLabel(backPage, `BACK • ${batch.batchNumber} • flip on long edge`, regular, pageHeight);

    sheetRows.forEach((row, index) => {
      const gridRow = Math.floor(index / 3);
      const col = index % 3;
      const frontX = marginX + col * (cardWidth + gapX);
      // Mirror the back horizontally so front/back align when duplex printed.
      const backX = marginX + (2 - col) * (cardWidth + gapX);
      const y = pageHeight - marginY - cardHeight - gridRow * (cardHeight + gapY);
      drawCardFront(frontPage, frontX, y, cardWidth, cardHeight, row, batch.institute.name, regular, bold);
      drawCardBack(backPage, backX, y, cardWidth, cardHeight, row, batch.institute.name, qrImages[index], regular, bold);
    });
  }

  return Buffer.from(await pdf.save());
}

type PdfCardRow = ReturnType<typeof rowsForBatch>[number];

const pdfNavy = rgb(0.025, 0.11, 0.21);
const pdfNavyLight = rgb(0.055, 0.2, 0.35);
const pdfGold = rgb(0.82, 0.58, 0.19);
const pdfInk = rgb(0.04, 0.12, 0.23);
const pdfMuted = rgb(0.37, 0.42, 0.49);

function drawSheetLabel(page: PDFPage, text: string, font: PDFFont, pageHeight: number) {
  page.drawText(text, { x: 56, y: pageHeight - 24, size: 7, font, color: rgb(0.45, 0.48, 0.52) });
}

function fitText(value: string, font: PDFFont, size: number, maxWidth: number) {
  let result = value.trim();
  while (result.length > 3 && font.widthOfTextAtSize(result, size) > maxWidth) result = `${result.slice(0, -4)}...`;
  return result;
}

function instituteInitials(name: string) {
  return name.split(/\s+/).filter(Boolean).map((part) => part[0]).join("").slice(0, 2).toUpperCase() || "ET";
}

function drawBrand(page: PDFPage, x: number, y: number, width: number, instituteName: string, bold: PDFFont, dark: boolean) {
  const crestSize = 30;
  const crestX = x + (width - crestSize) / 2;
  page.drawRectangle({
    x: crestX,
    y: y + 13,
    width: crestSize,
    height: crestSize,
    color: pdfNavyLight,
    borderColor: pdfGold,
    borderWidth: 1.2
  });
  const initials = instituteInitials(instituteName);
  const initialsSize = 11;
  page.drawText(initials, {
    x: crestX + (crestSize - bold.widthOfTextAtSize(initials, initialsSize)) / 2,
    y: y + 23,
    size: initialsSize,
    font: bold,
    color: rgb(1, 1, 1)
  });
  const name = fitText(instituteName.toUpperCase(), bold, 6.5, width - 18);
  page.drawText(name, {
    x: x + (width - bold.widthOfTextAtSize(name, 6.5)) / 2,
    y: y + 3,
    size: 6.5,
    font: bold,
    color: dark ? rgb(1, 1, 1) : pdfInk
  });
}

function drawCardFront(
  page: PDFPage,
  x: number,
  y: number,
  width: number,
  height: number,
  row: PdfCardRow,
  instituteName: string,
  regular: PDFFont,
  bold: PDFFont
) {
  page.drawRectangle({ x, y, width, height, color: rgb(0.995, 0.995, 0.99), borderColor: rgb(0.82, 0.84, 0.87), borderWidth: 0.6 });
  page.drawRectangle({ x, y, width, height: 47, color: pdfNavy });
  page.drawRectangle({ x, y: y + 47, width, height: 4, color: pdfGold });
  drawBrand(page, x, y + height - 59, width, instituteName, bold, false);

  const photoX = x + 11;
  const photoY = y + 78;
  const photoWidth = 52;
  const photoHeight = 83;
  page.drawRectangle({ x: photoX, y: photoY, width: photoWidth, height: photoHeight, color: rgb(0.93, 0.94, 0.95), borderColor: pdfGold, borderWidth: 1 });
  const studentInitials = instituteInitials(row.studentName);
  page.drawText(studentInitials, {
    x: photoX + (photoWidth - bold.widthOfTextAtSize(studentInitials, 18)) / 2,
    y: photoY + 34,
    size: 18,
    font: bold,
    color: pdfNavyLight
  });

  const textX = x + 72;
  const textWidth = width - 81;
  const name = fitText(row.studentName.toUpperCase(), bold, 9.5, textWidth);
  page.drawText(name, { x: textX, y: y + 145, size: 9.5, font: bold, color: pdfInk });
  page.drawLine({ start: { x: textX, y: y + 139 }, end: { x: x + width - 9, y: y + 139 }, color: pdfGold, thickness: 0.8 });
  page.drawText("STUDENT", { x: textX, y: y + 128, size: 7, font: bold, color: pdfGold });
  drawPdfDetail(page, textX, y + 112, "ID NO.", row.studentId, textWidth, regular, bold);
  drawPdfDetail(page, textX, y + 91, "GRADE", row.grade || "-", textWidth, regular, bold);
  drawPdfDetail(page, textX, y + 70, "CLASS", row.className || row.subject || "-", textWidth, regular, bold);

  page.drawText("NFC", { x: x + 17, y: y + 24, size: 12, font: bold, color: rgb(1, 1, 1) });
  page.drawText("TAP TO CONNECT", { x: x + 17, y: y + 13, size: 5.5, font: regular, color: rgb(0.78, 0.84, 0.9) });
  const cardNo = fitText(row.cardNumber || "CARD PENDING", bold, 6.5, 70);
  page.drawText(cardNo, { x: x + width - 10 - bold.widthOfTextAtSize(cardNo, 6.5), y: y + 20, size: 6.5, font: bold, color: rgb(1, 1, 1) });
}

function drawPdfDetail(page: PDFPage, x: number, y: number, label: string, value: string, maxWidth: number, regular: PDFFont, bold: PDFFont) {
  page.drawText(label, { x, y, size: 5.2, font: regular, color: pdfMuted });
  page.drawText(fitText(value, bold, 6.7, maxWidth), { x, y: y - 8, size: 6.7, font: bold, color: pdfInk });
}

function drawCardBack(
  page: PDFPage,
  x: number,
  y: number,
  width: number,
  height: number,
  row: PdfCardRow,
  instituteName: string,
  qrImage: PDFImage,
  regular: PDFFont,
  bold: PDFFont
) {
  page.drawRectangle({ x, y, width, height, color: pdfNavy, borderColor: rgb(0.1, 0.23, 0.38), borderWidth: 0.6 });
  page.drawRectangle({ x: x + width - 18, y: y + 48, width: 4, height: 100, color: pdfGold });
  page.drawRectangle({ x: x + width - 11, y: y + 48, width: 2, height: 100, color: pdfNavyLight });
  drawBrand(page, x, y + height - 63, width, instituteName, bold, true);

  const qrSize = 92;
  const qrX = x + (width - qrSize) / 2;
  const qrY = y + 72;
  page.drawRectangle({ x: qrX - 5, y: qrY - 5, width: qrSize + 10, height: qrSize + 10, color: rgb(1, 1, 1), borderColor: pdfGold, borderWidth: 1.2 });
  page.drawImage(qrImage, { x: qrX, y: qrY, width: qrSize, height: qrSize });
  const scanText = "SCAN TO VERIFY OR TAP THE CARD";
  page.drawText(scanText, {
    x: x + (width - bold.widthOfTextAtSize(scanText, 6.2)) / 2,
    y: y + 56,
    size: 6.2,
    font: bold,
    color: rgb(1, 1, 1)
  });
  page.drawLine({ start: { x: x + 56, y: y + 50 }, end: { x: x + width - 56, y: y + 50 }, color: pdfGold, thickness: 0.8 });
  page.drawRectangle({ x, y, width, height: 39, color: rgb(0.018, 0.075, 0.15) });
  const cardNo = fitText(row.cardNumber || row.studentId, bold, 7, width - 20);
  page.drawText(cardNo, {
    x: x + (width - bold.widthOfTextAtSize(cardNo, 7)) / 2,
    y: y + 22,
    size: 7,
    font: bold,
    color: rgb(1, 1, 1)
  });
  page.drawText("SECURE STUDENT IDENTITY", {
    x: x + (width - regular.widthOfTextAtSize("SECURE STUDENT IDENTITY", 5)) / 2,
    y: y + 11,
    size: 5,
    font: regular,
    color: rgb(0.62, 0.7, 0.79)
  });
}
