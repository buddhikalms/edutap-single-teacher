"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import { Bell, BookOpen, CalendarCheck, CreditCard, Inbox, LayoutDashboard, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

const items = [
  { href: "/portal", label: "Overview", icon: LayoutDashboard },
  { href: "/portal/classes", label: "Classes", icon: BookOpen },
  { href: "/portal/attendance", label: "Attendance", icon: CalendarCheck },
  { href: "/portal/payments", label: "Payments", icon: CreditCard },
  { href: "/portal/notifications", label: "Notifications", icon: Inbox },
  { href: "/portal/notices", label: "Notices", icon: Bell }
];

export function PortalNav() {
  return (
    <nav className="flex flex-wrap items-center gap-2">
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className="inline-flex h-10 items-center gap-2 rounded-lg border border-white/10 bg-white/10 px-3 text-sm font-semibold text-white/80 transition hover:bg-white/20 hover:text-white"
        >
          <item.icon className="h-4 w-4" />
          {item.label}
        </Link>
      ))}
      <Button variant="outline" className="border-white/20 bg-white/10 text-white hover:bg-white/20" onClick={() => signOut({ callbackUrl: "/portal/login" })}>
        <LogOut className="h-4 w-4" />
        Sign out
      </Button>
    </nav>
  );
}
