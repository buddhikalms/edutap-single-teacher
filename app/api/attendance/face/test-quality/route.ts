import { NextResponse } from "next/server";
import { z } from "zod";
import { enrolFaceTemplate, qualityFaceTemplate } from "@/lib/face-recognition-client";
import { requireStaffFaceAccess, StaffFaceError } from "@/lib/staff-face-attendance";

const schema = z.object({
  frames: z.array(z.string().startsWith("data:image/")).min(1).max(10),
  mode: z.enum(["quality", "embedding"]).default("quality")
});

export async function POST(request: Request) {
  try {
    await requireStaffFaceAccess("attendance");
    const body = schema.parse(await request.json());
    const serviceResult = body.mode === "embedding" ? await enrolFaceTemplate(body.frames) : await qualityFaceTemplate(body.frames);

    return NextResponse.json({
      ok: serviceResult.success,
      faceDetected: serviceResult.faceDetected,
      singleFace: serviceResult.singleFace,
      qualityScore: serviceResult.qualityScore,
      model: serviceResult.model,
      modelVersion: serviceResult.modelVersion,
      reasonCode: serviceResult.reasonCode,
      message: serviceResult.message ?? (serviceResult.success ? "Face service test passed." : "Face service rejected the sample."),
      embeddingGenerated: Boolean(serviceResult.embedding)
    });
  } catch (error) {
    if (error instanceof StaffFaceError) return NextResponse.json({ ok: false, code: error.code, message: error.message }, { status: error.statusCode });
    if (error instanceof z.ZodError) return NextResponse.json({ ok: false, message: "Invalid face test payload." }, { status: 422 });
    console.error(error);
    return NextResponse.json({ ok: false, message: "Could not test face service." }, { status: 500 });
  }
}
