import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: string;
      instituteId: string | null;
      branchId: string | null;
    } & DefaultSession["user"];
  }

  interface User {
    role: string;
    instituteId: string | null;
    branchId: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: string;
    instituteId: string | null;
    branchId: string | null;
  }
}
