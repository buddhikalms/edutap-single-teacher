import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { createMobileToken } from "@/lib/mobile-auth";
import { prisma } from "@/lib/prisma";
import { loginSchema } from "@/lib/validations";

export async function POST(request: Request) {
  try {
    const parsed = loginSchema.safeParse(await request.json());

    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, message: "Enter a valid email and password.", errors: parsed.error.flatten().fieldErrors },
        { status: 422 }
      );
    }

    const identifier = parsed.data.email.trim();
    const normalized = identifier.replace(/[^\d+]/g, "");
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: identifier.toLowerCase() },
          ...(normalized.length >= 6 ? [{ parent: { phone: { in: [identifier, normalized] } } }] : [])
        ]
      },
      select: {
        id: true,
        name: true,
        email: true,
        passwordHash: true,
        accountStatus: true,
        role: true,
        instituteId: true,
        parent: {
          include: {
            students: {
              select: {
                id: true,
                admissionNo: true,
                firstName: true,
                lastName: true,
                branch: { select: { id: true, name: true } }
              },
              orderBy: { firstName: "asc" }
            },
            studentLinks: {
              include: {
                student: {
                  select: {
                    id: true,
                    admissionNo: true,
                    firstName: true,
                    lastName: true,
                    branch: { select: { id: true, name: true } }
                  }
                }
              }
            }
          }
        },
        institute: { select: { id: true, name: true, logoUrl: true } }
      }
    });

    if (!user?.passwordHash || !["PARENT", "FAMILY"].includes(user.role) || !(await bcrypt.compare(parsed.data.password, user.passwordHash))) {
      return NextResponse.json({ ok: false, message: "Invalid parent credentials." }, { status: 401 });
    }
    if (user.accountStatus === "PENDING_APPROVAL") {
      return NextResponse.json({ ok: false, message: "Your enrollment request is pending teacher approval." }, { status: 403 });
    }
    if (user.accountStatus === "REJECTED") {
      return NextResponse.json({ ok: false, message: "Your enrollment request was not approved. Please contact the teacher." }, { status: 403 });
    }

    if (!user.instituteId || !user.parent) {
      return NextResponse.json({ ok: false, message: "This parent account is not linked to an institute." }, { status: 403 });
    }

    const token = await createMobileToken(user.id);
    const students = [...user.parent.students, ...user.parent.studentLinks.map((link) => link.student)].filter(
      (student, index, all) => all.findIndex((item) => item.id === student.id) === index
    );

    return NextResponse.json({
      ok: true,
      token: token.token,
      expiresAt: token.expiresAt.toISOString(),
      parent: {
        id: user.parent.id,
        name: user.parent.name,
        email: user.parent.email,
        phone: user.parent.phone
      },
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        institute: user.institute
      },
      students: students.map((student) => ({
        id: student.id,
        admissionNo: student.admissionNo,
        name: `${student.firstName} ${student.lastName}`.trim(),
        branch: student.branch
      }))
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ ok: false, message: "Could not sign in to the parent app." }, { status: 500 });
  }
}
