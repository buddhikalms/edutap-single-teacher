import { NextResponse } from "next/server";
import { z } from "zod";
import { MobileAuthError } from "@/lib/mobile-auth";
import { requireParentMobileUser } from "@/lib/parent-mobile-auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  id: z.string().optional(),
  ids: z.array(z.string()).optional(),
  markAll: z.boolean().optional()
});

export async function POST(request: Request) {
  try {
    const { instituteId, parentId, studentIds } = await requireParentMobileUser(request);
    const parsed = schema.safeParse(await request.json());

    if (!parsed.success) {
      return NextResponse.json({ ok: false, message: "Invalid notification read payload." }, { status: 422 });
    }

    const ids = Array.from(new Set([...(parsed.data.id ? [parsed.data.id] : []), ...(parsed.data.ids ?? [])]));

    if (!parsed.data.markAll && ids.length === 0) {
      return NextResponse.json({ ok: false, message: "Select at least one notification to mark as read." }, { status: 422 });
    }

    const result = await prisma.notification.updateMany({
      where: {
        instituteId,
        parentId,
        OR: [{ studentId: null }, { studentId: { in: studentIds } }],
        ...(parsed.data.markAll ? {} : { id: { in: ids } })
      },
      data: {
        status: "READ",
        readAt: new Date()
      }
    });

    return NextResponse.json({ ok: true, count: result.count });
  } catch (error) {
    if (error instanceof MobileAuthError) {
      return NextResponse.json({ ok: false, message: error.message }, { status: error.statusCode });
    }

    console.error(error);
    return NextResponse.json({ ok: false, message: "Could not mark notifications as read." }, { status: 500 });
  }
}
