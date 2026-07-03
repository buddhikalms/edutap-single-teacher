import { NextResponse } from "next/server";
import { z } from "zod";
import { completeStudentActivation } from "@/lib/student-activation";

const schema = z
  .object({
    activationToken: z.string().trim().min(1),
    password: z.string().min(8, "Password must be at least 8 characters."),
    confirmPassword: z.string().min(8, "Confirm your password.")
  })
  .refine((value) => value.password === value.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match."
  });

export async function POST(request: Request) {
  try {
    const parsed = schema.parse(await request.json());
    const result = await completeStudentActivation({
      activationToken: parsed.activationToken,
      password: parsed.password,
      request
    });

    return NextResponse.json(result, { status: result.ok ? 200 : result.status });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ ok: false, message: error.issues[0]?.message ?? "Check the setup form.", errors: error.flatten().fieldErrors }, { status: 422 });
    }

    console.error(error);
    return NextResponse.json({ ok: false, message: "Could not complete account setup." }, { status: 500 });
  }
}
