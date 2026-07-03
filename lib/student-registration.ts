import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import { Prisma, UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { studentSelfRegistrationSchema, type StudentSelfRegistrationInput } from "@/lib/validations";
import { findOrCreateParent } from "@/lib/parent-registration";

function toDate(value?: string) {
  return value ? new Date(value) : null;
}

function generateAdmissionNo() {
  return `REG-${Date.now().toString(36).toUpperCase()}-${randomUUID().slice(0, 6).toUpperCase()}`;
}

function duplicateMessage(error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    return "A student account, admission number, or email already exists with these details.";
  }

  return null;
}

export async function registerStudent(input: StudentSelfRegistrationInput) {
  const parsed = studentSelfRegistrationSchema.parse(input);
  const email = parsed.email.toLowerCase();

  const institute = await prisma.institute.findFirst({
    where: { slug: parsed.instituteSlug, active: true },
    include: {
      branches: {
        where: { isActive: true },
        orderBy: { createdAt: "asc" }
      }
    }
  });

  if (!institute) {
    throw new Error("Workspace was not found or is not accepting registrations.");
  }

  const branch =
    institute.branches.find((item) => item.id === parsed.branchId) ??
    institute.branches.find((item) => item.code.toLowerCase() === parsed.branchCode?.toLowerCase()) ??
    institute.branches[0];

  if (!branch) {
    throw new Error("This institute does not have an active branch for registration.");
  }

  const existingUser = await prisma.user.findUnique({ where: { email }, select: { id: true } });

  if (existingUser) {
    throw new Error("A user already exists with this student email.");
  }

  const passwordHash = await bcrypt.hash(parsed.password, 12);
  const admissionNo = parsed.admissionNo ?? generateAdmissionNo();

  try {
    const student = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name: `${parsed.firstName} ${parsed.lastName}`.trim(),
          email,
          passwordHash,
          passwordStatus: "ACTIVE",
          role: UserRole.STUDENT,
          accountStatus: "PENDING_APPROVAL",
          instituteId: institute.id,
          branchId: branch.id
        }
      });

      const parent = await findOrCreateParent(tx, institute.id, {
        name: parsed.parentName,
        relationship: parsed.parentRelationship,
        email: parsed.parentEmail,
        phone: parsed.parentPhone,
        nic: parsed.parentNic,
        address: parsed.parentAddress,
        appLogin: parsed.parentAppLogin,
        emergencyContactNumber: parsed.emergencyContactNumber,
        occupation: parsed.parentOccupation
      });

      const student = await tx.student.create({
        data: {
          admissionNo,
          firstName: parsed.firstName,
          lastName: parsed.lastName,
          email,
          phone: parsed.phone ?? null,
          dateOfBirth: toDate(parsed.dateOfBirth),
          status: "PENDING_APPROVAL",
          instituteId: institute.id,
          branchId: branch.id,
          attendanceToken: randomUUID(),
          userId: user.id,
          parents: {
            connect: { id: parent.id }
          }
        },
        select: {
          id: true,
          admissionNo: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true
        }
      });

      await tx.parentStudent.upsert({
        where: { parentId_studentId: { parentId: parent.id, studentId: student.id } },
        create: { parentId: parent.id, studentId: student.id, relation: parsed.parentRelationship },
        update: { relation: parsed.parentRelationship }
      });

      return student;
    });

    return {
      student: {
        id: student.id,
        admissionNo: student.admissionNo,
        name: `${student.firstName} ${student.lastName}`.trim(),
        email: student.email,
        phone: student.phone
      },
      institute: {
        id: institute.id,
        name: institute.name,
        slug: institute.slug
      },
      branch: {
        id: branch.id,
        name: branch.name,
        code: branch.code
      }
    };
  } catch (error) {
    const message = duplicateMessage(error);
    if (message) {
      throw new Error(message);
    }

    throw error;
  }
}
