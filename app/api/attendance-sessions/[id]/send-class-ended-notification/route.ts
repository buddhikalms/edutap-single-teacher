import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { sendClassEndedNotification } from "@/lib/parent-attendance-notifications";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    const { id } = await params;

    if (!session?.user?.id || !session.user.instituteId) {
      return NextResponse.json({ ok: false, message: "Authentication is required." }, { status: 401 });
    }

    const result = await sendClassEndedNotification({
      instituteId: session.user.instituteId,
      attendanceSessionId: id,
      sentById: session.user.id
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Could not send class over notifications." },
      { status: 500 }
    );
  }
}
