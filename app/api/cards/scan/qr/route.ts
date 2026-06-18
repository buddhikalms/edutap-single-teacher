import { NextResponse } from "next/server";
import { getTenantContext } from "@/lib/session";
import { findActiveCardByCredential, scanResultForCardStatus } from "@/lib/student-cards";

export async function POST(request: Request) {
  const { instituteId } = await getTenantContext();
  const body = await request.json();
  const card = await findActiveCardByCredential({ instituteId, scanType: "QR", value: body.qrToken ?? body.qrCode });

  if (!card) {
    return NextResponse.json({ ok: false, message: "QR card was not found." }, { status: 404 });
  }

  if (card.status !== "ACTIVE") {
    return NextResponse.json(
      {
        ok: false,
        message: `This card is no longer active. Status: ${card.status}.`,
        result: scanResultForCardStatus(card.status),
        card
      },
      { status: 403 }
    );
  }

  return NextResponse.json({ ok: true, card });
}
