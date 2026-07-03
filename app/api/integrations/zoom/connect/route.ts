import { NextResponse } from "next/server";
import { createZoomOAuthUrl } from "@/lib/live-meeting-providers";
import { getTenantContext } from "@/lib/session";

export async function GET(request: Request) {
  try {
    const { instituteId, userId, role } = await getTenantContext();
    if (!["SUPER_ADMIN", "INSTITUTE_ADMIN", "BRANCH_ADMIN", "TEACHER"].includes(role)) {
      return NextResponse.redirect(new URL("/dashboard/settings/live-classes?error=forbidden", request.url));
    }

    const url = await createZoomOAuthUrl({
      instituteId,
      userId,
      origin: new URL(request.url).origin
    });

    return NextResponse.redirect(url);
  } catch (error) {
    console.error(error);
    return NextResponse.redirect(new URL("/dashboard/settings/live-classes?error=zoom-connect", request.url));
  }
}
