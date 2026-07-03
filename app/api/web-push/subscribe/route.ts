import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hashEndpoint } from "@/lib/web-push";

const subscribeSchema = z.object({
  subscription: z.object({
    endpoint: z.string().url(),
    keys: z.object({
      p256dh: z.string().min(8),
      auth: z.string().min(8)
    })
  }),
  userAgent: z.string().optional(),
  platform: z.string().optional()
});

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || !session.user.instituteId || !["PARENT", "FAMILY"].includes(session.user.role)) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  const parsed = subscribeSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid push subscription." }, { status: 422 });
  }

  const parent = await prisma.parent.findFirst({
    where: { userId: session.user.id, instituteId: session.user.instituteId },
    select: { id: true }
  });
  if (!parent) {
    return NextResponse.json({ message: "This parent account is not linked to a guardian profile." }, { status: 403 });
  }

  const { endpoint, keys } = parsed.data.subscription;
  const subscription = await prisma.webPushSubscription.upsert({
    where: { endpointHash: hashEndpoint(endpoint) },
    create: {
      instituteId: session.user.instituteId,
      userId: session.user.id,
      parentId: parent.id,
      endpoint,
      endpointHash: hashEndpoint(endpoint),
      p256dh: keys.p256dh,
      auth: keys.auth,
      userAgent: parsed.data.userAgent ?? null,
      platform: parsed.data.platform ?? null,
      isActive: true
    },
    update: {
      instituteId: session.user.instituteId,
      userId: session.user.id,
      parentId: parent.id,
      p256dh: keys.p256dh,
      auth: keys.auth,
      userAgent: parsed.data.userAgent ?? null,
      platform: parsed.data.platform ?? null,
      isActive: true
    },
    select: { id: true, isActive: true }
  });

  return NextResponse.json({ ok: true, subscription });
}
