import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { loginSchema } from "@/lib/validations";
import { prisma } from "@/lib/prisma";

function normalizePhone(value: string) {
  return value.replace(/[^\d+]/g, "");
}

export const PENDING_ACCOUNT_MESSAGE = "Your enrollment request is pending teacher approval.";
export const REJECTED_ACCOUNT_MESSAGE = "Your enrollment request was not approved. Please contact the teacher.";

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt"
  },
  pages: {
    signIn: "/login"
  },
  providers: [
    CredentialsProvider({
      name: "Email and password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);

        if (!parsed.success) {
          return null;
        }

        const identifier = parsed.data.email.trim();
        const normalized = normalizePhone(identifier);
        const userByEmail = await prisma.user.findFirst({
          where: {
            OR: [
              { email: identifier.toLowerCase() },
              ...(normalized.length >= 6 ? [{ mobile: normalized }] : [])
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
            branchId: true,
            image: true
          }
        });
        const user =
          userByEmail ??
          (await findPortalUser(identifier));

        if (!user) {
          return null;
        }

        const isValid = user.passwordHash ? await bcrypt.compare(parsed.data.password, user.passwordHash) : false;

        if (!isValid) {
          return null;
        }
        if (user.role !== "FAMILY" && user.accountStatus === "PENDING_APPROVAL") throw new Error(PENDING_ACCOUNT_MESSAGE);
        if (user.role !== "FAMILY" && user.accountStatus === "REJECTED") throw new Error(REJECTED_ACCOUNT_MESSAGE);

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
          role: user.role,
          instituteId: user.instituteId,
          branchId: user.branchId
        };
      }
    }),
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [GoogleProvider({
          clientId: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET
        })]
      : [])
  ],
  callbacks: {
    async signIn({ account, profile }) {
      if (account?.provider !== "google") return true;
      const email = profile?.email?.toLowerCase();
      const googlePicture = (profile as { picture?: string } | undefined)?.picture;
      if (!email) return false;
      const existing = await prisma.user.findFirst({
        where: { OR: [{ googleId: account.providerAccountId }, { email }] }
      });
      if (existing && existing.role !== "FAMILY") return false;
      if (existing) {
        await prisma.user.update({
          where: { id: existing.id },
          data: {
            googleId: account.providerAccountId,
            image: googlePicture ?? existing.image,
            emailVerified: existing.emailVerified ?? new Date(),
            authProvider: existing.passwordHash ? "BOTH" : "GOOGLE"
          }
        });
      } else {
        await prisma.user.create({
          data: {
            name: profile?.name || email,
            email,
            googleId: account.providerAccountId,
            passwordHash: null,
            authProvider: "GOOGLE",
            role: "FAMILY",
            accountStatus: "PENDING_APPROVAL",
            image: googlePicture ?? null,
            emailVerified: new Date()
          }
        });
      }
      return true;
    },
    async jwt({ token, user, account }) {
      if (user) {
        const databaseUser = account?.provider === "google" && user.email
          ? await prisma.user.findUnique({ where: { email: user.email.toLowerCase() } })
          : null;
        token.id = databaseUser?.id ?? user.id;
        token.role = databaseUser?.role ?? user.role;
        token.instituteId = databaseUser?.instituteId ?? user.instituteId;
        token.branchId = databaseUser?.branchId ?? user.branchId;
        token.accountStatus = databaseUser?.accountStatus ?? "ACTIVE";
      }
      if (token.id && token.role === "FAMILY") {
        const current = await prisma.user.findUnique({
          where: { id: token.id },
          select: { role: true, instituteId: true, branchId: true, accountStatus: true }
        });
        if (current) {
          token.role = current.role;
          token.instituteId = current.instituteId;
          token.branchId = current.branchId;
          token.accountStatus = current.accountStatus;
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.instituteId = token.instituteId as string | null;
        session.user.branchId = token.branchId as string | null;
        session.user.accountStatus = token.accountStatus as string;
      }

      return session;
    }
  }
};

async function findPortalUser(identifier: string) {
  const normalized = normalizePhone(identifier);

  const parent = normalized.length >= 6 ? await prisma.parent.findFirst({
    where: {
      userId: { not: null },
      OR: [{ phone: identifier }, { phone: normalized }]
    },
    select: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          passwordHash: true,
          accountStatus: true,
          role: true,
          instituteId: true,
          branchId: true,
          image: true
        }
      }
    }
  }) : null;

  if (parent?.user) {
    return parent.user;
  }

  const student = await prisma.student.findFirst({
    where: {
      userId: { not: null },
      OR: [
        { phone: identifier },
        ...(normalized.length >= 6 ? [{ phone: normalized }] : []),
        { admissionNo: identifier },
        { admissionNo: identifier.toUpperCase() },
        { email: identifier.toLowerCase() }
      ]
    },
    select: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          passwordHash: true,
          accountStatus: true,
          role: true,
          instituteId: true,
          branchId: true,
          image: true
        }
      }
    }
  });

  return student?.user ?? null;
}
