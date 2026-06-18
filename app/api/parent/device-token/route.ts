import { NextResponse } from "next/server";
import { z } from "zod";
import { MobileAuthError } from "@/lib/mobile-auth";
import { requireParentMobileUser } from "@/lib/parent-mobile-auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  expoPushToken: z.string().trim().min(8),
  platform: z.string().trim().max(40).optional(),
  deviceName: z.string().trim().max(120).optional(),
  studentId: z.string().optional()
});

function isExpoPushToken(token: string) {
  return /^(Expo|Exponent)PushToken\[[^\]]+\]$/.test(token);
}

export async function POST(request: Request) {
  try {
    const { instituteId, parentId, userId, studentIds } = await requireParentMobileUser(request);
    const parsed = schema.safeParse(await request.json());

    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, message: "Invalid device token payload.", errors: parsed.error.flatten().fieldErrors },
        { status: 422 }
      );
    }

    if (!isExpoPushToken(parsed.data.expoPushToken)) {
      return NextResponse.json({ ok: false, message: "Expo push token is not valid." }, { status: 422 });
    }

    if (parsed.data.studentId && !studentIds.includes(parsed.data.studentId)) {
      return NextResponse.json({ ok: false, message: "This student is not linked to the parent account." }, { status: 403 });
    }

    const existing = await prisma.studentDevice.findFirst({
      where: {
        instituteId,
        parentId,
        expoPushToken: parsed.data.expoPushToken
      },
      select: { id: true }
    });

    const data = {
      instituteId,
      parentId,
      userId,
      studentId: parsed.data.studentId ?? null,
      expoPushToken: parsed.data.expoPushToken,
      pushToken: parsed.data.expoPushToken,
      platform: parsed.data.platform ?? null,
      deviceName: parsed.data.deviceName ?? null,
      isActive: true,
      lastUsedAt: new Date()
    };

    const device = existing
      ? await prisma.studentDevice.update({
          where: { id: existing.id },
          data,
          select: { id: true, isActive: true, platform: true, deviceName: true, updatedAt: true }
        })
      : await prisma.studentDevice.create({
          data,
          select: { id: true, isActive: true, platform: true, deviceName: true, updatedAt: true }
        });

    return NextResponse.json({
      ok: true,
      device: {
        ...device,
        updatedAt: device.updatedAt.toISOString()
      }
    });
  } catch (error) {
    if (error instanceof MobileAuthError) {
      return NextResponse.json({ ok: false, message: error.message }, { status: error.statusCode });
    }

    console.error(error);
    return NextResponse.json({ ok: false, message: "Could not save parent device token." }, { status: 500 });
  }
}
