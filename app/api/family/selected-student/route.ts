import { getServerSession } from "next-auth";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({ studentId: z.string().min(1) });

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "FAMILY" || !session.user.instituteId) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ message: "Select a student." }, { status: 422 });
  const link = await prisma.parentStudent.findFirst({
    where: {
      studentId: parsed.data.studentId,
      parent: { userId: session.user.id, instituteId: session.user.instituteId },
      student: { instituteId: session.user.instituteId }
    },
    select: { id: true }
  });
  if (!link) return NextResponse.json({ message: "This student is not linked to your EduTap Account." }, { status: 403 });
  (await cookies()).set("edutap-selected-student", parsed.data.studentId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365
  });
  return NextResponse.json({ ok: true });
}
