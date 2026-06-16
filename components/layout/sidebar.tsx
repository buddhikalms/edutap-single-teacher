import Link from "next/link";
import {
  BarChart3,
  BellRing,
  BookOpen,
  BookOpenCheck,
  CalendarCheck,
  CreditCard,
  GraduationCap,
  LayoutDashboard,
  Settings2,
  ShieldCheck,
  Trophy,
  UserPlus,
  UsersRound,
  Video
} from "lucide-react";
import { canAccess, roleAccess } from "@/lib/rbac";
import { cn } from "@/lib/utils";

const tenantNavItems = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard, area: "dashboard" },
  { href: "/students", label: "Students", icon: UsersRound, area: "students" },
  { href: "/teachers", label: "Teachers", icon: GraduationCap, area: "teachers" },
  { href: "/grades", label: "Grades", icon: BookOpenCheck, area: "grades" },
  { href: "/classes", label: "Classes", icon: BookOpen, area: "classes" },
  { href: "/enrollment", label: "Enrollment", icon: UserPlus, area: "enrollment" },
  { href: "/attendance", label: "Attendance", icon: CalendarCheck, area: "attendance" },
  { href: "/payments", label: "Payments", icon: CreditCard, area: "payments" },
  { href: "/homework", label: "Homework", icon: BookOpenCheck, area: "homework" },
  { href: "/quizzes", label: "Quizzes", icon: Trophy, area: "quizzes" },
  { href: "/live-classes", label: "Live Classes", icon: Video, area: "liveClasses" },
  { href: "/reports", label: "Reports", icon: BarChart3, area: "reports" },
  { href: "/notifications", label: "Notifications", icon: BellRing, area: "notifications" },
  { href: "/settings", label: "Settings", icon: Settings2, area: "settings" },
  { href: "/billing", label: "Billing", icon: CreditCard, area: "billing" }
];

const superAdminNavItems = [
  { href: "/admin", label: "Super admin", icon: ShieldCheck, area: "admin" }
];

export function Sidebar({ className, role }: { className?: string; role?: string }) {
  const navItems = (role === "SUPER_ADMIN" ? superAdminNavItems : tenantNavItems).filter((item) =>
    canAccess(role, item.area as keyof typeof roleAccess)
  );

  return (
    <aside className={cn("flex h-full flex-col border-r border-white/70 bg-primary text-white", className)}>
      <div className="flex h-20 items-center gap-3 px-6">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-primary shadow-glow">
          <GraduationCap className="h-6 w-6" />
        </div>
        <div>
          <p className="text-lg font-bold">ClassCard Pro</p>
          <p className="text-xs text-white/60">Premium command center</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-4 py-5">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-white/75 transition hover:bg-white/10 hover:text-white"
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="m-4 rounded-xl border border-white/10 bg-white/10 p-4">
        <p className="text-sm font-semibold">Growth pulse</p>
        <p className="mt-2 text-xs leading-5 text-white/60">
          Attendance, payments, and enrollment insight are ready for your next workflow.
        </p>
      </div>
    </aside>
  );
}
