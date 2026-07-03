"use server";

import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { DEFAULT_GRADES } from "@/lib/single-teacher";

export type SetupState = {
  ok: boolean;
  message: string;
  email?: string;
};

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

export async function completeSetup(_: SetupState, formData: FormData): Promise<SetupState> {
  const name = text(formData, "name");
  const subject = text(formData, "subject");
  const bio = text(formData, "bio");
  const photoUrl = text(formData, "photoUrl");
  const phone = text(formData, "phone");
  const email = text(formData, "email").toLowerCase();
  const brandName = text(formData, "brandName") || `${name}'s Classes`;
  const logoUrl = text(formData, "logoUrl");
  const themeColor = text(formData, "themeColor") || "#0f766e";
  const locationName = text(formData, "locationName");
  const locationAddress = text(formData, "locationAddress");
  const currency = text(formData, "currency") || "LKR";
  const password = text(formData, "password");
  const confirmPassword = text(formData, "confirmPassword");

  if (!name || !subject || !phone || !email || !locationName || !password) {
    return { ok: false, message: "Complete all required fields before finishing setup." };
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, message: "Enter a valid email address." };
  }

  if (password.length < 8) {
    return { ok: false, message: "Use a password with at least 8 characters." };
  }

  if (password !== confirmPassword) {
    return { ok: false, message: "The passwords do not match." };
  }

  try {
    const passwordHash = await bcrypt.hash(password, 12);

    await prisma.$transaction(async (tx) => {
      const existingOwner = await tx.teacher.findFirst({ where: { userId: { not: null } }, select: { id: true } });
      if (existingOwner) {
        throw new Error("SETUP_COMPLETE");
      }

      const institute = await tx.institute.create({
        data: {
          name: brandName,
          slug: "teacher",
          email,
          phone,
          address: locationAddress || null,
          logoUrl: logoUrl || null
        }
      });

      const branch = await tx.branch.create({
        data: {
          instituteId: institute.id,
          name: locationName,
          code: "MAIN",
          location: locationName,
          address: locationAddress || null,
          phone
        }
      });

      const user = await tx.user.create({
        data: {
          name,
          email,
          passwordHash,
          role: "INSTITUTE_ADMIN",
          image: photoUrl || null,
          instituteId: institute.id,
          branchId: branch.id
        }
      });

      await tx.teacher.create({
        data: {
          name,
          email,
          phone,
          specialty: subject,
          bio: bio || null,
          photoUrl: photoUrl || null,
          subjects: [subject],
          teachingMode: "BOTH",
          userId: user.id,
          instituteId: institute.id,
          branchId: branch.id
        }
      });

      await tx.instituteSettings.create({
        data: {
          instituteId: institute.id,
          currency,
          themeColor,
          logoPlaceholder: logoUrl || null,
          receiptFooter: `Thank you for learning with ${brandName}.`
        }
      });

      await tx.grade.createMany({
        data: DEFAULT_GRADES.map((gradeName, order) => ({
          instituteId: institute.id,
          name: gradeName,
          order
        }))
      });

      await tx.subject.createMany({
        data: Array.from(new Set([subject, "English", "Mathematics", "Science", "ICT", "Sinhala", "History"])).map((name) => ({
          instituteId: institute.id,
          name
        })),
        skipDuplicates: true
      });
    });

    return { ok: true, message: "Your teacher workspace is ready.", email };
  } catch (error) {
    if (error instanceof Error && error.message === "SETUP_COMPLETE") {
      return { ok: false, message: "Setup has already been completed. Sign in to continue." };
    }

    console.error(error);
    return { ok: false, message: "Could not complete setup. Check the details and database connection, then try again." };
  }
}
