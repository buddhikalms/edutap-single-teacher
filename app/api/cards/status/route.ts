import { NextResponse } from "next/server";
import { updateCardStatus } from "@/app/(dashboard)/cards/actions";

export async function POST(request: Request) {
  const result = await updateCardStatus(await request.json());
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
