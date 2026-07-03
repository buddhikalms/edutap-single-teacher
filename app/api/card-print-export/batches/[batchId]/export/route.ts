import { NextResponse } from "next/server";
import { CardPrintBatchStatus } from "@prisma/client";
import {
  buildCsvExport,
  buildExcelExport,
  buildPdfExport,
  buildZipExport,
  canManageCardPrintExport,
  getCardPrintBatchForExport,
  rowsForBatch,
  type CardPrintExportFormat
} from "@/lib/card-print-export";
import { getTenantContext } from "@/lib/session";
import { prisma } from "@/lib/prisma";

const contentTypes: Record<CardPrintExportFormat, string> = {
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  csv: "text/csv; charset=utf-8",
  zip: "application/zip",
  pdf: "application/pdf",
  json: "application/json; charset=utf-8"
};

const extensions: Record<CardPrintExportFormat, string> = {
  xlsx: "xlsx",
  csv: "csv",
  zip: "zip",
  pdf: "pdf",
  json: "json"
};

export async function GET(request: Request, { params }: { params: Promise<{ batchId: string }> }) {
  const { instituteId, role } = await getTenantContext();
  if (!canManageCardPrintExport(role)) {
    return NextResponse.json({ ok: false, message: "You do not have access to export card print batches." }, { status: 403 });
  }

  const { batchId } = await params;
  const format = (new URL(request.url).searchParams.get("format") || "xlsx") as CardPrintExportFormat;
  if (!["xlsx", "csv", "zip", "pdf", "json"].includes(format)) {
    return NextResponse.json({ ok: false, message: "Unsupported export format." }, { status: 400 });
  }

  const batch = await getCardPrintBatchForExport(instituteId, batchId);
  let body: Buffer;

  if (format === "xlsx") body = await buildExcelExport(batch);
  else if (format === "csv") body = await buildCsvExport(batch);
  else if (format === "zip") body = await buildZipExport(batch);
  else if (format === "pdf") body = await buildPdfExport(batch);
  else body = Buffer.from(JSON.stringify({ batch: { id: batch.id, batchNumber: batch.batchNumber, title: batch.title }, rows: rowsForBatch(batch) }, null, 2));

  if (batch.status === "DRAFT") {
    await prisma.cardPrintBatch.update({ where: { id: batch.id }, data: { status: CardPrintBatchStatus.EXPORTED, exportedAt: new Date() } });
  }

  const filename = `${batch.batchNumber}_card_print_export.${extensions[format]}`;
  return new NextResponse(new Uint8Array(body), {
    headers: {
      "Content-Type": contentTypes[format],
      "Content-Disposition": `attachment; filename="${filename}"`
    }
  });
}
