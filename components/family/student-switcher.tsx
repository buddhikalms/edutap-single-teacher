"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Select } from "@/components/ui/select";

export function StudentSwitcher({ students, selectedId }: { students: Array<{ id: string; name: string }>; selectedId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  if (students.length <= 1) return <p className="text-sm font-semibold text-white/80">{students[0]?.name}</p>;
  return <Select aria-label="Selected student" value={selectedId} disabled={loading} className="min-w-52 bg-white text-slate-900" onChange={async (event) => {
    setLoading(true);
    await fetch("/api/family/selected-student", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ studentId: event.target.value }) });
    router.refresh();
    setLoading(false);
  }}>
    {students.map((student) => <option key={student.id} value={student.id}>{student.name}</option>)}
  </Select>;
}
