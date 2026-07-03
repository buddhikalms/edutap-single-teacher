import { withAuth } from "next-auth/middleware";
import { canAccess } from "@/lib/rbac";

export default withAuth({
  callbacks: {
    authorized({ token, req }) {
      const pathname = req.nextUrl.pathname;

      if (pathname === "/student/login" || pathname === "/student/register") return true;

      if (!token) {
        return false;
      }

      if (pathname.startsWith("/students")) {
        return canAccess(token.role, "students");
      }

      if (pathname.startsWith("/dashboard/classes") || pathname.startsWith("/dashboard/courses")) {
        return canAccess(token.role, "classes");
      }
      if (pathname.startsWith("/dashboard/enrollment-requests")) {
        return canAccess(token.role, "enrollment");
      }
      if (pathname.startsWith("/subjects")) {
        return canAccess(token.role, "subjects");
      }

      if (pathname.startsWith("/enrollment")) {
        return canAccess(token.role, "enrollment");
      }

      if (pathname.startsWith("/attendance")) {
        return canAccess(token.role, "attendance");
      }

      if (pathname.startsWith("/payments")) {
        return canAccess(token.role, "payments");
      }

      if (pathname.startsWith("/homework")) {
        return canAccess(token.role, "homework");
      }

      if (pathname.startsWith("/quizzes")) {
        return canAccess(token.role, "quizzes");
      }

      if (pathname.startsWith("/reports")) {
        return canAccess(token.role, "reports");
      }

      if (pathname.startsWith("/settings")) {
        return canAccess(token.role, "settings");
      }

      if (pathname.startsWith("/notifications")) {
        return canAccess(token.role, "notifications");
      }

      if (pathname.startsWith("/admin")) {
        return canAccess(token.role, "admin");
      }

      return canAccess(token.role, "dashboard");
    }
  },
  pages: {
    signIn: "/login"
  }
});

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/students/:path*",
    "/subjects/:path*",
    "/enrollment/:path*",
    "/attendance/:path*",
    "/payments/:path*",
    "/homework/:path*",
    "/quizzes/:path*",
    "/reports/:path*",
    "/settings/:path*",
    "/notifications/:path*",
    "/admin/:path*"
  ]
};
