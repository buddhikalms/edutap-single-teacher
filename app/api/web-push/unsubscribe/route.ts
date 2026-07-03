import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hashEndpoint } from "@/lib/web-push";

const unsubscribeSchema = z.object({
  endpoint: z.string().url()
});

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || !session.user.instituteId || !["PARENT", "FAMILY"].includes(session.user.role)) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  const parsed = unsubscribeSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid push subscription." }, { status: 422 });
  }

  await prisma.webPushSubscription.updateMany({
    where: {
      endpointHash: hashEndpoint(parsed.data.endpoint),
      userId: session.user.id,
      instituteId: session.user.instituteId
    },
    data: { isActive: false }
  });

  return NextResponse.json({ ok: true });
}
