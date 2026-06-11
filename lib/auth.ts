import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { loginSchema } from "@/lib/validations";
import { prisma } from "@/lib/prisma";

function normalizePhone(value: string) {
  return value.replace(/[^\d+]/g, "");
}

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
        const userByEmail = await prisma.user.findUnique({
          where: { email: identifier.toLowerCase() },
          select: {
            id: true,
            name: true,
            email: true,
            passwordHash: true,
            role: true,
            instituteId: true,
            branchId: true,
            image: true
          }
        });
        const user =
          userByEmail ??
          (await findPortalUserByPhone(identifier));

        if (!user) {
          return null;
        }

        const isValid = await bcrypt.compare(parsed.data.password, user.passwordHash);

        if (!isValid) {
          return null;
        }

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
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.instituteId = user.instituteId;
        token.branchId = user.branchId;
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.instituteId = token.instituteId as string | null;
        session.user.branchId = token.branchId as string | null;
      }

      return session;
    }
  }
};

async function findPortalUserByPhone(identifier: string) {
  const normalized = normalizePhone(identifier);

  if (normalized.length < 6) {
    return null;
  }

  const parent = await prisma.parent.findFirst({
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
          role: true,
          instituteId: true,
          branchId: true,
          image: true
        }
      }
    }
  });

  if (parent?.user) {
    return parent.user;
  }

  const student = await prisma.student.findFirst({
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
