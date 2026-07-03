import { NextResponse } from "next/server";
import { exchangeZoomCode } from "@/lib/live-meeting-providers";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  if (error) {
    return NextResponse.redirect(new URL(`/dashboard/settings/live-classes?error=${encodeURIComponent(error)}`, request.url));
  }

  if (!code || !state) {
    return NextResponse.redirect(new URL("/dashboard/settings/live-classes?error=missing-zoom-code", request.url));
  }

  try {
    await exchangeZoomCode({ code, state, origin: url.origin });
    return NextResponse.redirect(new URL("/dashboard/settings/live-classes?connected=zoom", request.url));
  } catch (callbackError) {
    console.error(callbackError);
    return NextResponse.redirect(new URL("/dashboard/settings/live-classes?error=zoom-callback", request.url));
  }
}
