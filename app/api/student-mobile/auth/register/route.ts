import { NextResponse } from "next/server";
import { z } from "zod";
import { registerStudent } from "@/lib/student-registration";
import { studentSelfRegistrationSchema } from "@/lib/validations";
import { checkRateLimit, rateLimitKey, rateLimitResponse } from "@/lib/rate-limit";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = studentSelfRegistrationSchema.safeParse(body);
    const key = rateLimitKey(request, "student-mobile-auth-register", parsed.success ? parsed.data.email : null);
    const limit = checkRateLimit({ key, limit: 5, windowMs: 60 * 60 * 1000 });
    if (!limit.ok) return rateLimitResponse(limit.resetAt);

    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, message: "Please check the student registration form.", errors: parsed.error.flatten().fieldErrors },
        { status: 422 }
      );
    }

    const result = await registerStudent(parsed.data);

    return NextResponse.json(
      {
        ok: true,
        message: "Student registration completed.",
        ...result
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { ok: false, message: "Please check the student registration form.", errors: error.flatten().fieldErrors },
        { status: 422 }
      );
    }

    const message = error instanceof Error ? error.message : "Could not register student.";
    const status = message.includes("already exists") ? 409 : 400;

    return NextResponse.json({ ok: false, message }, { status });
  }
}
