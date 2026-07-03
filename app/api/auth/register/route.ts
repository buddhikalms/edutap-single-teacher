import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { message: "Workspace registration is disabled. Use the first-install setup wizard." },
    { status: 410 }
  );
}
