import { FaceEnrollmentWizard } from "@/components/face-attendance/FaceEnrollmentWizard";
import { getStudentWebContext } from "@/lib/student-web";

export default async function StudentFaceProfilePage() {
  await getStudentWebContext();
  return <FaceEnrollmentWizard />;
}
