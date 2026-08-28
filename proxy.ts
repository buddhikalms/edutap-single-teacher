import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { canAccess } from "@/lib/rbac";

const RESERVED_TEACHER_SLUGS = new Set(["www", "app", "admin", "api", "student", "parent", "support"]);

const protectedAreas = [
  { prefix: "/dashboard/classes", area: "classes" },
  { prefix: "/dashboard/courses", area: "classes" },
  { prefix: "/dashboard/enrollment-requests", area: "enrollment" },
  { prefix: "/dashboard", area: "dashboard" },
  { prefix: "/students", area: "students" },
  { prefix: "/subjects", area: "subjects" },
  { prefix: "/enrollment", area: "enrollment" },
  { prefix: "/attendance", area: "attendance" },
  { prefix: "/payments", area: "payments" },
  { prefix: "/homework", area: "homework" },
  { prefix: "/quizzes", area: "quizzes" },
  { prefix: "/reports", area: "reports" },
  { prefix: "/settings", area: "settings" },
  { prefix: "/notifications", area: "notifications" },
  { prefix: "/admin", area: "admin" }
] as const;

const publicStudentPaths = new Set(["/student/login", "/student/register"]);

function requestSubdomain(request: NextRequest) {
  const hostname = (request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "").split(":")[0]?.toLowerCase() ?? "";
  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "edutap.lk";
  const localRootDomain = "localhost";

  const activeRootDomain = hostname.endsWith(`.${rootDomain}`)
    ? rootDomain
    : hostname.endsWith(`.${localRootDomain}`)
      ? localRootDomain
      : null;

  if (!activeRootDomain) {
    return null;
  }

  const subdomain = hostname.slice(0, -activeRootDomain.length - 1);
  if (!subdomain || subdomain.includes(".") || RESERVED_TEACHER_SLUGS.has(subdomain)) {
    return null;
  }

  return subdomain;
}

function protectedArea(pathname: string) {
  return protectedAreas.find((item) => pathname === item.prefix || pathname.startsWith(`${item.prefix}/`));
}

export default async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const requestHeaders = new Headers(request.headers);
  const subdomain = requestSubdomain(request);

  if (subdomain) {
    requestHeaders.set("x-edutap-teacher-slug", subdomain);
  }

  const protectedRoute = protectedArea(pathname);
  if (!protectedRoute || publicStudentPaths.has(pathname)) {
    if (subdomain && pathname === "/enroll") {
      const rewriteUrl = request.nextUrl.clone();
      rewriteUrl.pathname = "/student/register";
      return NextResponse.rewrite(rewriteUrl, { request: { headers: requestHeaders } });
    }

    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET ?? process.env.AUTH_SECRET
  });

  if (!token) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", request.nextUrl.pathname + request.nextUrl.search);
    return NextResponse.redirect(loginUrl);
  }

  if (!canAccess(String(token.role), protectedRoute.area)) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|manifest.json|icons/|uploads/|sw.js).*)"]
};
