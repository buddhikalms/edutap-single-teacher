import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json({ message: "Additional teacher registration is not available in single-teacher mode." }, { status: 410 });
}
