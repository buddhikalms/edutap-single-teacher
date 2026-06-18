import { NextResponse } from "next/server";
import { validateCardIdentifiers } from "@/app/(dashboard)/cards/actions";

export async function POST(request: Request) {
  const result = await validateCardIdentifiers(await request.json());
  return NextResponse.json(result, { status: result.ok ? 200 : 409 });
}
