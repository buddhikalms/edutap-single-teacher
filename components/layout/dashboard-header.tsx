"use client";

import { useState } from "react";
import { Menu, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sidebar } from "@/components/layout/sidebar";
import { UserMenu } from "@/components/layout/user-menu";

export function DashboardHeader({
  instituteName,
  user
}: {
  instituteName: string;
  user: { name: string; email: string; role: string };
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-30 flex h-20 items-center justify-between border-b border-border/70 bg-background/85 px-4 backdrop-blur-xl sm:px-6 lg:px-8">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <Button variant="outline" size="icon" className="lg:hidden" onClick={() => setOpen(true)} aria-label="Open navigation">
            <Menu className="h-5 w-5" />
          </Button>
          <div className="hidden min-w-[240px] md:block">
            <p className="text-sm text-muted-foreground">Workspace</p>
            <h1 className="truncate text-lg font-semibold">{instituteName}</h1>
          </div>
          <div className="relative w-full max-w-xl">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="h-11 bg-white pl-9" placeholder="Search students, receipts, classes..." />
          </div>
        </div>
        <UserMenu name={user.name} email={user.email} role={user.role} />
      </header>

      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button className="absolute inset-0 bg-primary/40 backdrop-blur-sm" aria-label="Close navigation" onClick={() => setOpen(false)} />
          <div className="relative h-full w-[300px] max-w-[86vw]">
            <Sidebar />
            <Button
              variant="outline"
              size="icon"
              className="absolute right-4 top-4 bg-white"
              onClick={() => setOpen(false)}
              aria-label="Close navigation"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>
      ) : null}
    </>
  );
}
