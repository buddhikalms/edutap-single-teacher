import { getFamilyContext } from "@/lib/family";
import { prisma } from "@/lib/prisma";

export default async function FamilyProfilePage() {
  const context = await getFamilyContext();
  const user = await prisma.user.findUnique({ where: { id: context.userId }, select: { name: true, email: true, mobile: true, authProvider: true } });
  return <div className="max-w-xl rounded-2xl border bg-white p-6"><h2 className="text-2xl font-semibold">EduTap profile</h2><dl className="mt-5 grid gap-4 text-sm"><Row label="Name" value={user?.name} /><Row label="Mobile" value={user?.mobile} /><Row label="Email" value={user?.email} /><Row label="Login provider" value={user?.authProvider} /></dl></div>;
}

function Row({ label, value }: { label: string; value?: string | null }) {
  return <div><dt className="text-muted-foreground">{label}</dt><dd className="font-semibold">{value || "Not provided"}</dd></div>;
}
