import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { qrPngBuffer } from "@/lib/card-print-export";

export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const card = await prisma.studentCard.findFirst({ where: { qrToken: token }, select: { id: true, qrToken: true } });

  if (!card?.qrToken) {
    return NextResponse.json({ ok: false, message: "QR token was not found." }, { status: 404 });
  }

  const png = await qrPngBuffer(card.qrToken);
  return new NextResponse(new Uint8Array(png), {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "private, max-age=3600",
      "Content-Disposition": `inline; filename="${card.qrToken}_QR.png"`
    }
  });
}
