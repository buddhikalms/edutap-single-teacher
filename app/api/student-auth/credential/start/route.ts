import { CardScanType } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { startStudentActivation } from "@/lib/student-activation";

const schema = z.object({
  method: z.enum(["QR", "NFC"]),
  qrToken: z.string().trim().optional(),
  nfcUid: z.string().trim().optional()
});

export async function POST(request: Request) {
  try {
    const parsed = schema.parse(await request.json());
    const value = parsed.method === "NFC" ? parsed.nfcUid : parsed.qrToken;

    if (!value) {
      return NextResponse.json({ ok: false, message: "Scan a QR code or NFC card first." }, { status: 400 });
    }

    const result = await startStudentActivation({
      method: parsed.method as CardScanType,
      value,
      request
    });

    return NextResponse.json(result, { status: result.ok ? 200 : result.status });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ ok: false, message: "Invalid card scan payload.", errors: error.flatten().fieldErrors }, { status: 422 });
    }

    console.error(error);
    return NextResponse.json({ ok: false, message: "Could not verify the student card." }, { status: 500 });
  }
}
