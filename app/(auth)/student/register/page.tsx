import { StudentRegistrationForm } from "@/components/auth/student-registration-form";
import { prisma } from "@/lib/prisma";

export default async function StudentRegisterPage() {
  const institutes = await prisma.institute.findMany({
    where: { active: true },
    select: {
      id: true,
      name: true,
      slug: true,
      branches: {
        where: { isActive: true },
        select: { id: true, name: true, code: true },
        orderBy: { createdAt: "asc" }
      }
    },
    orderBy: { name: "asc" }
  });

  return <StudentRegistrationForm institutes={institutes.filter((institute) => institute.branches.length > 0)} />;
}
