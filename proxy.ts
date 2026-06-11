import { withAuth } from "next-auth/middleware";
import { canAccess } from "@/lib/rbac";

export default withAuth({
  callbacks: {
    authorized({ token, req }) {
      const pathname = req.nextUrl.pathname;

      if (!token) {
        return false;
      }

      if (pathname.startsWith("/students")) {
        return canAccess(token.role, "students");
      }

      if (pathname.startsWith("/teachers")) {
        return canAccess(token.role, "teachers");
      }

      if (pathname.startsWith("/classes")) {
        return canAccess(token.role, "classes");
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

      if (pathname.startsWith("/reports")) {
        return canAccess(token.role, "reports");
      }

      if (pathname.startsWith("/settings")) {
        return canAccess(token.role, "settings");
      }

      if (pathname.startsWith("/billing")) {
        return canAccess(token.role, "billing");
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
    "/teachers/:path*",
    "/classes/:path*",
    "/enrollment/:path*",
    "/attendance/:path*",
    "/payments/:path*",
    "/reports/:path*",
    "/settings/:path*",
    "/billing/:path*",
    "/notifications/:path*",
    "/admin/:path*"
  ]
};
