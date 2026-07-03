import { NextResponse } from "next/server";
import { exchangeGoogleCode } from "@/lib/live-meeting-providers";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  if (error) {
    return NextResponse.redirect(new URL(`/dashboard/settings/live-classes?error=${encodeURIComponent(error)}`, request.url));
  }

  if (!code || !state) {
    return NextResponse.redirect(new URL("/dashboard/settings/live-classes?error=missing-google-code", request.url));
  }

  try {
    await exchangeGoogleCode({ code, state, origin: url.origin });
    return NextResponse.redirect(new URL("/dashboard/settings/live-classes?connected=google", request.url));
  } catch (callbackError) {
    console.error(callbackError);
    try {
      const statePayload = state.split(".")[0];
      const parsed = JSON.parse(Buffer.from(statePayload, "base64url").toString("utf8")) as { instituteId?: string };
      if (parsed.instituteId) {
        await prisma.integrationAccount.upsert({
          where: { instituteId_provider: { instituteId: parsed.instituteId, provider: "GOOGLE" } },
          create: {
            instituteId: parsed.instituteId,
            provider: "GOOGLE",
            connected: false,
            lastError: callbackError instanceof Error ? callbackError.message : "Google connection failed."
          },
          update: {
            connected: false,
            lastError: callbackError instanceof Error ? callbackError.message : "Google connection failed."
          }
        });
      }
    } catch {
      // Best effort only; the settings page still shows a generic callback error.
    }

    return NextResponse.redirect(new URL("/dashboard/settings/live-classes?error=google-callback", request.url));
  }
}
