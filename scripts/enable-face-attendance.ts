import { prisma } from "../lib/prisma";

async function main() {
  const instituteId = process.argv[2] || process.env.FACE_ATTENDANCE_INSTITUTE_ID;

  if (!instituteId) {
    throw new Error("Pass an institute id: npm run face:enable -- <instituteId>");
  }

  const institute = await prisma.institute.findUnique({
    where: { id: instituteId },
    select: { id: true, name: true }
  });

  if (!institute) {
    throw new Error(`Institute was not found for id: ${instituteId}`);
  }

  const faceSettings = {
    faceAttendanceEnabled: true,
    faceAllowStudentSelfEnrollment: true,
    faceRequireParentConsent: true,
    faceConsentAge: 16,
    faceMatchThreshold: Number(process.env.FACE_MATCH_THRESHOLD || 0.82),
    faceManualReviewThreshold: Number(process.env.FACE_MANUAL_REVIEW_THRESHOLD || 0.72),
    faceLivenessThreshold: Number(process.env.FACE_LIVENESS_THRESHOLD || 0.85),
    faceMaximumAttempts: Number(process.env.FACE_MAX_ATTEMPTS || 3),
    faceAttemptCooldownSeconds: Number(process.env.FACE_ATTEMPT_COOLDOWN_SECONDS || 30),
    faceVerificationTokenTtlSeconds: Number(process.env.FACE_VERIFICATION_TOKEN_TTL_SECONDS || 60),
    faceFallbackMethods: ["QR", "NFC", "MANUAL"]
  };

  const settings = await prisma.instituteSettings.upsert({
    where: { instituteId },
    create: {
      instituteId,
      ...faceSettings
    },
    update: {
      ...faceSettings
    }
  });

  console.log(`Face attendance enabled for ${institute.name} (${settings.instituteId})`);
}

async function listInstitutes() {
  const institutes = await prisma.institute.findMany({
    select: { id: true, name: true },
    orderBy: { createdAt: "desc" },
    take: 20
  });

  if (!institutes.length) {
    console.log("No institutes found.");
    return;
  }

  console.log("Available institutes:");
  for (const institute of institutes) {
    console.log(`${institute.id}  ${institute.name}`);
  }
}

async function run() {
  if (process.argv.includes("--list")) {
    await listInstitutes();
    return;
  }

  await main();
}

run()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
