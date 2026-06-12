import { NextResponse } from "next/server";
import { requireStudentMobileUser, StudentMobileAuthError } from "@/lib/student-mobile-auth";

export async function GET(request: Request) {
  try {
    const { student } = await requireStudentMobileUser(request);
    return NextResponse.json({
      ok: true,
      student: {
        id: student.id,
        admissionNo: student.admissionNo,
        name: `${student.firstName} ${student.lastName}`,
        email: student.email,
        phone: student.phone,
        status: student.status,
        avatarUrl: student.avatarUrl,
        qrCode: student.qrCode,
        branch: student.branch,
        institute: student.institute,
        parents: student.parents.map((parent) => ({
          id: parent.id,
          name: parent.name,
          phone: parent.phone,
          email: parent.email,
          occupation: parent.occupation
        }))
      }
    });
  } catch (error) {
    if (error instanceof StudentMobileAuthError) return NextResponse.json({ ok: false, message: error.message }, { status: error.statusCode });
    console.error(error);
    return NextResponse.json({ ok: false, message: "Could not load profile." }, { status: 500 });
  }
}
