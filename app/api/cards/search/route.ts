import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTenantContext } from "@/lib/session";

export async function GET(request: Request) {
  const { instituteId } = await getTenantContext();
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim();
  const status = searchParams.get("status")?.trim();

  const cards = await prisma.studentCard.findMany({
    where: {
      instituteId,
      ...(status && status !== "ALL" ? { status: status as never } : {}),
      ...(query
        ? {
            OR: [
              { cardNumber: { contains: query } },
              { nfcUid: { contains: query } },
              { qrCode: { contains: query } },
              { qrToken: { contains: query } },
              { student: { firstName: { contains: query } } },
              { student: { lastName: { contains: query } } },
              { student: { admissionNo: { contains: query } } }
            ]
          }
        : {})
    },
    include: {
      student: { select: { id: true, firstName: true, lastName: true, admissionNo: true } }
    },
    orderBy: { updatedAt: "desc" },
    take: 100
  });

  return NextResponse.json({ ok: true, cards });
}
