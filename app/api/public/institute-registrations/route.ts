import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { SubscriptionPlanKey, SubscriptionStatus, UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getPlanDefinition } from "@/lib/subscription-plans";
import { publicInstituteRegistrationSchema } from "@/lib/validations";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = publicInstituteRegistrationSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ message: "Please check the institute registration form.", errors: parsed.error.flatten().fieldErrors }, { status: 422 });
    }

    const data = parsed.data;
    const email = data.email.toLowerCase();
    const existingUser = await prisma.user.findUnique({ where: { email }, select: { id: true } });

    if (existingUser) {
      return NextResponse.json({ message: "An owner account already exists with this email." }, { status: 409 });
    }

    const slug = await uniqueInstituteSlug(data.instituteName);
    const passwordHash = await bcrypt.hash(data.password, 12);
    const selectedPlan = getPlanDefinition(data.preferredPackage as SubscriptionPlanKey);
    const branches = Array.from({ length: data.branchCount }, (_, index) => ({
      name: index === 0 ? "Main Campus" : `Branch ${index + 1}`,
      code: index === 0 ? "MAIN" : `BR${index + 1}`,
      address: data.address,
      phone: data.phone
    }));

    const institute = await prisma.institute.create({
      data: {
        name: data.instituteName,
        slug,
        email,
        phone: data.phone,
        address: data.address,
        logoUrl: data.logoUrl ?? null,
        branches: { create: branches },
        subscription: {
          create: {
            plan: selectedPlan.id,
            status: SubscriptionStatus.TRIAL,
            currentPeriodEnd: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
            monthlyPrice: selectedPlan.price,
            yearlyPrice: selectedPlan.yearlyPrice,
            studentLimit: selectedPlan.studentLimit,
            teacherLimit: selectedPlan.teacherLimit,
            branchLimit: selectedPlan.branchLimit,
            classLimit: selectedPlan.classLimit,
            courseLimit: selectedPlan.courseLimit,
            storageLimitMb: selectedPlan.storageLimitMb,
            smsCredits: selectedPlan.smsCredits,
            liveClassAccess: selectedPlan.liveClassAccess,
            parentNotificationAccess: selectedPlan.parentNotificationAccess,
            customBrandingAccess: selectedPlan.customBrandingAccess
          }
        }
      },
      include: { branches: { orderBy: { createdAt: "asc" } } }
    });

    await prisma.user.create({
      data: {
        name: data.ownerName,
        email,
        passwordHash,
        role: UserRole.INSTITUTE_ADMIN,
        instituteId: institute.id,
        branchId: institute.branches[0]?.id
      }
    });

    return NextResponse.json({ message: "Institute registered successfully.", slug, status: "TRIAL" }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "Something went wrong while creating the institute." }, { status: 500 });
  }
}

async function uniqueInstituteSlug(name: string) {
  const base = slugify(name);
  let slug = base;
  let suffix = 2;

  while (await prisma.institute.findUnique({ where: { slug }, select: { id: true } })) {
    slug = `${base}-${suffix}`;
    suffix += 1;
  }

  return slug;
}

function slugify(value: string) {
  const slug = value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return slug || `institute-${Date.now()}`;
}
