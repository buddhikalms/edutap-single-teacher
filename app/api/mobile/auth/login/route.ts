import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { loginSchema } from "@/lib/validations";
import { prisma } from "@/lib/prisma";
import { createMobileToken, isOperationalRole } from "@/lib/mobile-auth";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, message: "Enter a valid email and password.", errors: parsed.error.flatten().fieldErrors },
        { status: 422 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: parsed.data.email.toLowerCase() },
      select: {
        id: true,
        name: true,
        email: true,
        passwordHash: true,
        role: true,
        image: true,
        instituteId: true,
        branchId: true,
        institute: { select: { id: true, name: true, logoUrl: true } },
        branch: { select: { id: true, name: true } }
      }
    });

    if (!user?.passwordHash || !(await bcrypt.compare(parsed.data.password, user.passwordHash))) {
      return NextResponse.json({ ok: false, message: "Invalid email or password." }, { status: 401 });
    }

    if (!user.instituteId) {
      return NextResponse.json({ ok: false, message: "This account is not linked to an institute." }, { status: 403 });
    }

    if (!isOperationalRole(user.role)) {
      return NextResponse.json({ ok: false, message: "Students and parents cannot access the admin scanner app." }, { status: 403 });
    }

    const token = await createMobileToken(user.id);

    return NextResponse.json({
      ok: true,
      token: token.token,
      expiresAt: token.expiresAt.toISOString(),
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        image: user.image,
        instituteId: user.instituteId,
        branchId: user.branchId,
        institute: user.institute,
        branch: user.branch
      }
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ ok: false, message: "Could not sign in to the mobile app." }, { status: 500 });
  }
}
