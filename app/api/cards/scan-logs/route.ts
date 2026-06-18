import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTenantContext } from "@/lib/session";

export async function GET(request: Request) {
  const { instituteId } = await getTenantContext();
  const { searchParams } = new URL(request.url);
  const studentId = searchParams.get("studentId") ?? undefined;
  const cardId = searchParams.get("cardId") ?? undefined;

  const scanLogs = await prisma.cardScanLog.findMany({
    where: {
      instituteId,
      ...(studentId ? { studentId } : {}),
      ...(cardId ? { cardId } : {})
    },
    include: {
      card: { select: { id: true, cardNumber: true, status: true } },
      student: { select: { id: true, firstName: true, lastName: true, admissionNo: true } },
      classGroup: { select: { id: true, name: true } },
      scannedBy: { select: { id: true, name: true } }
    },
    orderBy: { scannedAt: "desc" },
    take: 100
  });

  return NextResponse.json({ ok: true, scanLogs });
}
