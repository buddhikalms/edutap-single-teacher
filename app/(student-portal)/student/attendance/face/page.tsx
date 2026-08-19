import { MobileFaceAttendance } from "@/components/face-attendance/MobileFaceAttendance";
import { getStudentWebContext } from "@/lib/student-web";

export default async function StudentFaceAttendancePage() {
  await getStudentWebContext();
  return <MobileFaceAttendance />;
}
