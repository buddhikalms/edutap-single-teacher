import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTenantContext } from "@/lib/session";

export async function GET(request: Request) {
  const { instituteId } = await getTenantContext();
  const { searchParams } = new URL(request.url);
  const studentId = searchParams.get("studentId") ?? undefined;
  const cardId = searchParams.get("cardId") ?? undefined;

  const history = await prisma.studentCardHistory.findMany({
    where: {
      instituteId,
      ...(studentId ? { studentId } : {}),
      ...(cardId ? { cardId } : {})
    },
    include: {
      performedBy: { select: { id: true, name: true } },
      card: { select: { id: true, cardNumber: true, status: true } }
    },
    orderBy: { performedAt: "desc" },
    take: 100
  });

  return NextResponse.json({ ok: true, history });
}
