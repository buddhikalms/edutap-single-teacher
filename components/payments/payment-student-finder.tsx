"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, QrCode, Radio, Search } from "lucide-react";
import { toast } from "sonner";
import { QrCodeScanner } from "@/components/cards/camera-qr-scanner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/utils";

type Student = { id: string; name: string; admissionNo: string; pending: number };
type NfcEvent = Event & { serialNumber?: string };
type NfcReader = { scan: (options?: { signal?: AbortSignal }) => Promise<void>; onreading: ((event: NfcEvent) => void) | null; onreadingerror: (() => void) | null };
declare global { interface Window { NDEFReader?: new () => NfcReader } }

export function PaymentStudentFinder({ students, currency }: { students: Student[]; currency: string }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [qrOpen, setQrOpen] = useState(false);
  const [nfcScanning, setNfcScanning] = useState(false);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? students.filter((s) => s.name.toLowerCase().includes(q) || s.admissionNo.toLowerCase().includes(q)) : students;
  }, [query, students]);

  async function findCard(kind: "qr" | "nfc", value: string) {
    const response = await fetch(`/api/cards/scan/${kind}`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(kind === "qr" ? { qrToken: value } : { nfcUid: value })
    });
    const result = await response.json();
    if (!response.ok || !result.card?.student?.id) throw new Error(result.message ?? "Student card was not found.");
    router.push(`/payments/students/${result.card.student.id}`);
  }

  async function scanNfc() {
    if (!window.NDEFReader) return toast.error("Web NFC is unavailable. Search for the student or scan their QR code.");
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 20000);
    setNfcScanning(true);
    try {
      const reader = new window.NDEFReader();
      await reader.scan({ signal: controller.signal });
      toast.info("Hold the student's NFC card near this device.");
      reader.onreading = async (event) => {
        window.clearTimeout(timeout); controller.abort(); setNfcScanning(false);
        if (!event.serialNumber) return toast.error("The card UID could not be read.");
        try { await findCard("nfc", event.serialNumber); } catch (error) { toast.error(error instanceof Error ? error.message : "Student card was not found."); }
      };
      reader.onreadingerror = () => { window.clearTimeout(timeout); setNfcScanning(false); toast.error("Could not read the NFC card."); };
    } catch (error) {
      window.clearTimeout(timeout); setNfcScanning(false);
      toast.error(error instanceof Error ? error.message : "Could not start NFC.");
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1"><Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name or admission number..." className="pl-9" /></div>
        <Button type="button" variant="outline" onClick={() => setQrOpen(true)}><QrCode className="h-4 w-4" />Scan QR</Button>
        <Button type="button" variant="outline" onClick={scanNfc} disabled={nfcScanning}>{nfcScanning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Radio className="h-4 w-4" />}Read NFC</Button>
      </div>
      <div className="max-h-[420px] space-y-2 overflow-y-auto">
        {filtered.map((student) => (
          <button key={student.id} type="button" onClick={() => router.push(`/payments/students/${student.id}`)} className="flex w-full items-center justify-between rounded-xl border bg-white/72 p-4 text-left transition hover:bg-muted/40">
            <span><span className="block font-semibold">{student.name}</span><span className="text-xs text-muted-foreground">{student.admissionNo}</span></span>
            <Badge variant={student.pending > 0 ? "warning" : "success"}>{student.pending > 0 ? formatCurrency(student.pending, currency) : "clear"}</Badge>
          </button>
        ))}
        {!filtered.length ? <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">No students found.</p> : null}
      </div>
      <QrCodeScanner open={qrOpen} onClose={() => setQrOpen(false)} onScan={async (value) => {
        setQrOpen(false);
        try { await findCard("qr", value); } catch (error) { toast.error(error instanceof Error ? error.message : "Student card was not found."); }
      }} />
    </div>
  );
}
