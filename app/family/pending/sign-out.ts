"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";

export async function signOut() {
  const store = await cookies();
  for (const cookie of store.getAll()) {
    if (cookie.name.includes("next-auth.")) store.delete(cookie.name);
  }
  redirect("/family/login");
}
