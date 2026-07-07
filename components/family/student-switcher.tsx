"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { Check, ChevronDown, Loader2, LogOut, UsersRound } from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";

type StudentOption = {
  id: string;
  name: string;
  admissionNo: string;
  avatarUrl: string | null;
};

function initials(name: string) {
  return name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
}

export function StudentSwitcher({ students, selectedId }: { students: StudentOption[]; selectedId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const selected = students.find((student) => student.id === selectedId) ?? students[0];

  async function switchStudent(studentId: string) {
    if (studentId === selectedId || loading) return;
    setLoading(true);
    try {
      const response = await fetch("/api/family/selected-student", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId })
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(body?.message || "Could not switch student.");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not switch student.");
    } finally {
      setLoading(false);
    }
  }

  if (!selected) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className="h-12 min-w-0 justify-between gap-3 border-white/20 bg-white/10 px-2 text-white hover:bg-white/20 hover:text-white sm:min-w-64"
          disabled={loading}
        >
          <Avatar className="h-8 w-8 border border-white/25">
            <AvatarImage src={selected.avatarUrl ?? undefined} alt="" />
            <AvatarFallback className="bg-white text-xs text-primary">{initials(selected.name)}</AvatarFallback>
          </Avatar>
          <span className="min-w-0 flex-1 text-left">
            <span className="block truncate text-sm font-semibold">{selected.name}</span>
            <span className="block truncate text-[11px] font-normal text-white/65">
              {students.length > 1 ? `${students.length} student accounts` : selected.admissionNo}
            </span>
          </span>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ChevronDown className="h-4 w-4" />}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuLabel className="flex items-center gap-2">
          <UsersRound className="h-4 w-4 text-primary" />
          {students.length > 1 ? "Switch student account" : "Student account"}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {students.map((student) => (
          <DropdownMenuItem key={student.id} className="gap-3 py-2.5" onSelect={() => void switchStudent(student.id)}>
            <Avatar className="h-9 w-9">
              <AvatarImage src={student.avatarUrl ?? undefined} alt="" />
              <AvatarFallback className="text-xs">{initials(student.name)}</AvatarFallback>
            </Avatar>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-medium">{student.name}</span>
              <span className="block truncate text-xs text-muted-foreground">{student.admissionNo}</span>
            </span>
            {student.id === selectedId ? <Check className="h-4 w-4 text-primary" /> : null}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="text-destructive focus:text-destructive"
          onSelect={() => void signOut({ callbackUrl: "/family/login" })}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Log out of EduTap
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
