"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import { Bell, BookOpen, CalendarCheck, CreditCard, LayoutDashboard, LogOut, UserRound, Users } from "lucide-react";
import { Button } from "@/components/ui/button";

const items = [
  ["/family/dashboard", "Dashboard", LayoutDashboard],
  ["/family/students", "Students", Users],
  ["/family/attendance", "Attendance", CalendarCheck],
  ["/family/payments", "Payments", CreditCard],
  ["/family/homework", "Learning", BookOpen],
  ["/family/notifications", "Alerts", Bell],
  ["/family/profile", "Profile", UserRound]
] as const;

export function FamilyNav() {
  return <nav className="flex flex-wrap gap-2">
    {items.map(([href, label, Icon]) => <Link key={href} href={href} className="inline-flex h-9 items-center gap-2 rounded-lg bg-white/10 px-3 text-sm font-medium text-white/80 hover:bg-white/20"><Icon className="h-4 w-4" />{label}</Link>)}
    <Button size="sm" variant="outline" className="border-white/20 bg-white/10 text-white" onClick={() => signOut({ callbackUrl: "/family/login" })}><LogOut className="h-4 w-4" />Sign out</Button>
  </nav>;
}
