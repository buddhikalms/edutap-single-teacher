import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { registerInstituteSchema } from "@/lib/validations";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = registerInstituteSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { message: "Please check the registration form.", errors: parsed.error.flatten().fieldErrors },
        { status: 422 }
      );
    }

    const data = parsed.data;
    const existingInstitute = await prisma.institute.findUnique({
      where: { slug: data.slug }
    });

    if (existingInstitute) {
      return NextResponse.json({ message: "That institute slug is already taken." }, { status: 409 });
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: data.adminEmail.toLowerCase() }
    });

    if (existingUser) {
      return NextResponse.json({ message: "An admin already exists with this email." }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(data.password, 12);

    const institute = await prisma.institute.create({
      data: {
        name: data.instituteName,
        slug: data.slug,
        email: data.email.toLowerCase(),
        phone: data.phone,
        address: data.address,
        branches: {
          create: {
            name: "Main Campus",
            code: "MAIN",
            phone: data.phone,
            address: data.address
          }
        }
      },
      include: {
        branches: true
      }
    });

    await prisma.user.create({
      data: {
        name: data.adminName,
        email: data.adminEmail.toLowerCase(),
        passwordHash,
        role: UserRole.INSTITUTE_ADMIN,
        instituteId: institute.id,
        branchId: institute.branches[0]?.id
      }
    });

    return NextResponse.json({ message: "Institute registered successfully." }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "Something went wrong while creating the institute." }, { status: 500 });
  }
}
