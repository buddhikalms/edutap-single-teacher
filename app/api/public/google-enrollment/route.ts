import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json({ message: "Google enrollment is currently disabled. Please use the student enrollment form." }, { status: 410 });
}
