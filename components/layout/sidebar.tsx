"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  BellRing,
  BookOpen,
  BookOpenCheck,
  CalendarCheck,
  CreditCard,
  Printer,
  GraduationCap,
  LayoutDashboard,
  Settings2,
  Trophy,
  UserPlus,
  UsersRound,
  Video
} from "lucide-react";
import { canAccess, roleAccess } from "@/lib/rbac";
import { cn } from "@/lib/utils";

const tenantNavItems = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard, area: "dashboard", group: "Main" },
  { href: "/students", label: "Students", icon: UsersRound, area: "students", group: "People" },
  { href: "/grades", label: "Grades", icon: BookOpenCheck, area: "grades", group: "Academics" },
  { href: "/subjects", label: "Subjects", icon: BookOpen, area: "subjects", group: "Academics" },
  { href: "/dashboard/classes", label: "Classes", icon: BookOpen, area: "classes", group: "Academics" },
  { href: "/dashboard/courses", label: "Courses", icon: GraduationCap, area: "classes", group: "Learning" },
  { href: "/enrollment", label: "Enrollment", icon: UserPlus, area: "enrollment", group: "Academics" },
  { href: "/dashboard/enrollment-requests", label: "Enrollment requests", icon: UserPlus, area: "enrollment", group: "Academics" },
  { href: "/attendance", label: "Attendance", icon: CalendarCheck, area: "attendance", group: "Operations" },
  { href: "/cards", label: "Cards", icon: CreditCard, area: "cards", group: "Operations" },
  { href: "/dashboard/card-print-export", label: "Card Print Export", icon: Printer, area: "cards", group: "Operations" },
  { href: "/payments", label: "Payments", icon: CreditCard, area: "payments", group: "Operations" },
  { href: "/homework", label: "Homework", icon: BookOpenCheck, area: "homework", group: "Learning" },
  { href: "/quizzes", label: "Quizzes", icon: Trophy, area: "quizzes", group: "Learning" },
  { href: "/live-classes", label: "Live Classes", icon: Video, area: "liveClasses", group: "Learning" },
  { href: "/reports", label: "Reports", icon: BarChart3, area: "reports", group: "Insights" },
  { href: "/notifications", label: "Notifications", icon: BellRing, area: "notifications", group: "Insights" },
  { href: "/settings", label: "Profile & settings", icon: Settings2, area: "settings", group: "Workspace" }
];

export function Sidebar({ className, role, pendingEnrollmentCount = 0 }: { className?: string; role?: string; pendingEnrollmentCount?: number }) {
  const pathname = usePathname();
  const navItems = tenantNavItems.filter((item) =>
    canAccess(role, item.area as keyof typeof roleAccess)
  );
  const groupedItems = navItems.reduce<Record<string, typeof navItems>>((groups, item) => {
    groups[item.group] = [...(groups[item.group] ?? []), item];
    return groups;
  }, {});

  return (
    <aside
      className={cn(
        "flex h-dvh max-h-dvh min-h-0 flex-col overflow-hidden border-r border-white/10 bg-primary text-white shadow-[18px_0_50px_-34px_rgba(15,23,42,0.7)]",
        className
      )}
    >
      <div className="shrink-0 border-b border-white/10 px-5 py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-primary shadow-glow">
            <GraduationCap className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <p className="text-lg font-bold">EduTap</p>
            <p className="text-xs text-white/60">Teacher command center</p>
          </div>
        </div>
      </div>

      <nav className="sidebar-scroll min-h-0 flex-1 overflow-y-auto px-3 py-4">
        {Object.entries(groupedItems).map(([group, items]) => (
          <div key={group} className="pb-5 last:pb-1">
            <p className="px-3 pb-2 text-[11px] font-semibold uppercase text-white/40">{group}</p>
            <div className="space-y-1">
              {items.map((item) => {
                const active = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(`${item.href}/`));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "group flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium text-white/72 transition",
                      "hover:bg-white/10 hover:text-white",
                      active && "bg-white text-primary shadow-glow hover:bg-white hover:text-primary"
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10 text-white/72 transition group-hover:bg-white/15 group-hover:text-white",
                        active && "bg-primary/10 text-primary group-hover:bg-primary/10 group-hover:text-primary"
                      )}
                    >
                      <item.icon className="h-4 w-4" />
                    </span>
                    <span className="truncate">{item.label}</span>
                    {item.href === "/dashboard/enrollment-requests" && pendingEnrollmentCount > 0 ? (
                      <span className={cn(
                        "ml-auto min-w-6 rounded-full bg-amber-400 px-2 py-0.5 text-center text-xs font-bold text-amber-950",
                        active && "bg-primary text-white"
                      )}>
                        {pendingEnrollmentCount > 99 ? "99+" : pendingEnrollmentCount}
                      </span>
                    ) : null}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="shrink-0 border-t border-white/10 p-4">
        <div className="rounded-xl border border-white/10 bg-white/[0.08] p-4">
          <p className="text-sm font-semibold">Your teaching day</p>
          <p className="mt-2 text-xs leading-5 text-white/60">
            Attendance, payments, homework, and parent alerts are always close at hand.
          </p>
        </div>
      </div>
    </aside>
  );
}
