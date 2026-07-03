import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { readPaymentSlip } from "@/lib/payment-slips";
import { prisma } from "@/lib/prisma";
import { canAccess } from "@/lib/rbac";

export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: Promise<{ slipId: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ message: "Sign in to view this payment slip." }, { status: 401 });

  const { slipId } = await params;
  const slip = await prisma.enrollmentPaymentSlip.findUnique({
    where: { id: slipId },
    include: {
      enrollmentRequest: { select: { instituteId: true } },
      student: { select: { userId: true } }
    }
  });
  if (!slip) return NextResponse.json({ message: "Payment slip not found." }, { status: 404 });

  const isOwner = slip.familyUserId === session.user.id || slip.student?.userId === session.user.id;
  const isTeacher =
    slip.enrollmentRequest.instituteId === session.user.instituteId &&
    (canAccess(session.user.role, "enrollment") || canAccess(session.user.role, "payments"));
  if (!isOwner && !isTeacher) return NextResponse.json({ message: "You cannot view this payment slip." }, { status: 403 });

  try {
    const file = await readPaymentSlip(slip.storageKey);
    const download = new URL(request.url).searchParams.get("download") === "1";
    const safeName = slip.fileName.replace(/["\r\n]/g, "_");
    return new NextResponse(file, {
      headers: {
        "Content-Type": slip.fileType,
        "Content-Length": String(file.byteLength),
        "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${safeName}"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff"
      }
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "The payment slip file is unavailable." }, { status: 404 });
  }
}
