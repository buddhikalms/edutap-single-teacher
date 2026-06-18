import { Prisma, UserRole } from "@prisma/client";

type ParentInput = {
  name: string;
  relationship: string;
  email?: string;
  phone: string;
  nic?: string;
  address?: string;
  appLogin: string;
  emergencyContactNumber: string;
  occupation?: string;
};

function normalizePhone(value: string) {
  return value.replace(/[^\d+]/g, "");
}

export async function findOrCreateParent(tx: Prisma.TransactionClient, instituteId: string, input: ParentInput) {
  const email = input.email?.toLowerCase() ?? null;
  const appLogin = input.appLogin.trim();
  const normalizedPhone = normalizePhone(input.phone);
  const normalizedLogin = normalizePhone(appLogin);
  const loginEmail = appLogin.includes("@") ? appLogin.toLowerCase() : null;

  const existingParent = await tx.parent.findFirst({
    where: {
      instituteId,
      OR: [
        { phone: input.phone },
        ...(normalizedPhone !== input.phone ? [{ phone: normalizedPhone }] : []),
        ...(email ? [{ email }] : []),
        { appLoginIdentifier: appLogin },
        ...(loginEmail ? [{ email: loginEmail }] : []),
        ...(normalizedLogin ? [{ phone: normalizedLogin }, { appLoginIdentifier: normalizedLogin }] : [])
      ]
    },
    select: { id: true, userId: true }
  });

  const existingUser =
    loginEmail || email
      ? await tx.user.findFirst({
          where: {
            instituteId,
            role: UserRole.PARENT,
            OR: [{ email: loginEmail ?? email ?? "" }, ...(email && loginEmail && email !== loginEmail ? [{ email }] : [])]
          },
          select: { id: true }
        })
      : null;

  if (existingParent) {
    return tx.parent.update({
      where: { id: existingParent.id },
      data: {
        name: input.name,
        relationship: input.relationship,
        email,
        phone: input.phone,
        nic: input.nic ?? null,
        address: input.address ?? null,
        appLoginIdentifier: appLogin,
        emergencyContactNumber: input.emergencyContactNumber,
        occupation: input.occupation ?? null,
        userId: existingParent.userId ?? existingUser?.id ?? null
      },
      select: { id: true }
    });
  }

  return tx.parent.create({
    data: {
      name: input.name,
      relationship: input.relationship,
      email,
      phone: input.phone,
      nic: input.nic ?? null,
      address: input.address ?? null,
      appLoginIdentifier: appLogin,
      emergencyContactNumber: input.emergencyContactNumber,
      occupation: input.occupation ?? null,
      instituteId,
      userId: existingUser?.id ?? null
    },
    select: { id: true }
  });
}
