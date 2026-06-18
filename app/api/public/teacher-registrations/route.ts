import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { SubscriptionPlanKey } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { publicTeacherRegistrationSchema } from "@/lib/validations";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = publicTeacherRegistrationSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ message: "Please check the teacher registration form.", errors: parsed.error.flatten().fieldErrors }, { status: 422 });
    }

    const data = parsed.data;
    const email = data.email.toLowerCase();
    const [existingUser, existingRequest] = await Promise.all([
      prisma.user.findUnique({ where: { email }, select: { id: true } }),
      prisma.teacherRegistrationRequest.findUnique({ where: { email }, select: { id: true } })
    ]);

    if (existingUser || existingRequest) {
      return NextResponse.json({ message: "A user or teacher request already exists with this email." }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(data.password, 12);

    await prisma.teacherRegistrationRequest.create({
      data: {
        fullName: data.fullName,
        email,
        phone: data.phone,
        passwordHash,
        profilePhotoUrl: data.profilePhotoUrl ?? null,
        subject: data.subject,
        gradesTaught: data.gradesTaught.split(",").map((item) => item.trim()).filter(Boolean),
        teachingMode: data.teachingMode,
        experience: data.experience,
        qualifications: data.qualifications,
        bio: data.bio,
        preferredPackage: data.preferredPackage as SubscriptionPlanKey,
        adminNotifiedAt: new Date()
      }
    });

    return NextResponse.json({ message: "Teacher registration request submitted.", status: "PENDING_APPROVAL" }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "Something went wrong while submitting the teacher request." }, { status: 500 });
  }
}
