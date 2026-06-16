"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  useReactTable
} from "@tanstack/react-table";
import { CheckCircle2, Loader2, QrCode, Radio, ReceiptText, Search, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { markDuePayment } from "@/app/(dashboard)/payments/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { formatCurrency } from "@/lib/utils";

export type DueRow = {
  key: string;
  studentId: string;
  studentName: string;
  admissionNo: string;
  nfcUid: string | null;
  attendanceToken: string | null;
  classGroupId: string;
  className: string;
  month: string;
  fee: number;
  paidAmount: number;
  discount: number;
  balance: number;
  status: "PENDING" | "PAID" | "PARTIAL" | "OVERDUE";
  dueDate: string;
  receiptId: string | null;
};

export type DueClassOption = {
  id: string;
  name: string;
};

export function DuePaymentsManager({ rows, classes, month }: { rows: DueRow[]; classes: DueClassOption[]; month: string }) {
  const router = useRouter();
  const [globalFilter, setGlobalFilter] = useState("");
  const [classFilter, setClassFilter] = useState("ALL");
  const [selectedMonth, setSelectedMonth] = useState(month);
  const [nfcUid, setNfcUid] = useState("");
  const [qrToken, setQrToken] = useState("");
  const [highlightedStudentId, setHighlightedStudentId] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<{
    ok: boolean;
    title: string;
    detail: string;
    studentId?: string;
  } | null>(null);
  const [edits, setEdits] = useState<Record<string, { paidAmount: number; discount: number; method: "CASH" | "BANK_TRANSFER" | "CARD" | "ONLINE" }>>({});
  const [isPending, startTransition] = useTransition();

  const filteredRows = useMemo(
    () =>
      rows.filter((row) => {
        const classMatch = classFilter === "ALL" || row.classGroupId === classFilter;
        const monthMatch = row.month === selectedMonth;
        return classMatch && monthMatch;
      }),
    [rows, classFilter, selectedMonth]
  );

  const monthRows = useMemo(() => rows.filter((row) => row.month === selectedMonth), [rows, selectedMonth]);

  function editFor(row: DueRow) {
    return edits[row.key] ?? { paidAmount: Math.max(0, row.balance), discount: row.discount, method: "CASH" as const };
  }

  function updateEdit(row: DueRow, patch: Partial<{ paidAmount: number; discount: number; method: "CASH" | "BANK_TRANSFER" | "CARD" | "ONLINE" }>) {
    setEdits((current) => ({ ...current, [row.key]: { ...editFor(row), ...patch } }));
  }

  function submit(row: DueRow) {
    const edit = editFor(row);
    startTransition(async () => {
      const result = await markDuePayment({
        classGroupId: row.classGroupId,
        month: row.month,
        studentId: row.studentId,
        paidAmount: edit.paidAmount,
        discount: edit.discount,
        method: edit.method,
        note: undefined,
        receivedBy: undefined
      });

      if (result.ok) {
        toast.success(result.message);
        router.refresh();
        if (result.receiptId) {
          router.push(`/payments/receipts/${result.receiptId}`);
        }
      } else {
        toast.error(result.message);
      }
    });
  }

  function findByCredential(kind: "nfc" | "qr") {
    const credential = kind === "nfc" ? nfcUid.trim() : qrToken.trim();

    if (!credential) {
      toast.error(kind === "nfc" ? "Enter or tap an NFC UID." : "Paste or scan a QR token.");
      return;
    }

    const normalized = credential.toLowerCase();
    const matches = monthRows.filter((row) =>
      kind === "nfc" ? row.nfcUid?.toLowerCase() === normalized : row.attendanceToken?.toLowerCase() === normalized
    );

    if (!matches.length) {
      setHighlightedStudentId(null);
      setScanResult({
        ok: false,
        title: kind === "nfc" ? "NFC card not found" : "QR token not found",
        detail: "No due payment row matched this credential for the selected month."
      });
      toast.error("No due payment found for this credential.");
      return;
    }

    const first = matches[0];
    setHighlightedStudentId(first.studentId);
    setClassFilter("ALL");
    setGlobalFilter(first.admissionNo);
    setScanResult({
      ok: true,
      title: first.studentName,
      detail: `${matches.length} due row${matches.length === 1 ? "" : "s"} found for ${selectedMonth}.`,
      studentId: first.studentId
    });
    toast.success("Student found for payment marking.");
  }

  const columns: ColumnDef<DueRow>[] = [
      {
        accessorKey: "studentName",
        header: "Student",
        cell: ({ row }) => (
          <div>
            <Link href={`/payments/students/${row.original.studentId}`} className="font-semibold hover:underline">
              {row.original.studentName}
            </Link>
            <p className="text-xs text-muted-foreground">{row.original.admissionNo}</p>
          </div>
        )
      },
      { accessorKey: "className", header: "Class" },
      {
        accessorKey: "fee",
        header: "Fee",
        cell: ({ row }) => formatCurrency(row.original.fee)
      },
      {
        accessorKey: "balance",
        header: "Balance",
        cell: ({ row }) => (
          <div>
            <p className="font-semibold">{formatCurrency(row.original.balance)}</p>
            <Badge variant={row.original.status === "PAID" ? "success" : row.original.status === "OVERDUE" ? "warning" : "outline"}>
              {row.original.status.toLowerCase()}
            </Badge>
          </div>
        )
      },
      {
        id: "collect",
        header: "Collect",
        cell: ({ row }) => {
          const edit = editFor(row.original);
          return (
            <div className="grid min-w-[420px] grid-cols-[1fr_1fr_1fr_auto] gap-2">
              <Input
                type="number"
                step="0.01"
                value={edit.paidAmount}
                onChange={(event) => updateEdit(row.original, { paidAmount: Number(event.target.value) })}
                disabled={row.original.status === "PAID"}
              />
              <Input
                type="number"
                step="0.01"
                value={edit.discount}
                onChange={(event) => updateEdit(row.original, { discount: Number(event.target.value) })}
                disabled={row.original.status === "PAID"}
              />
              <Select
                value={edit.method}
                onChange={(event) => updateEdit(row.original, { method: event.target.value as typeof edit.method })}
                disabled={row.original.status === "PAID"}
              >
                <option value="CASH">Cash</option>
                <option value="BANK_TRANSFER">Bank</option>
                <option value="CARD">Card</option>
                <option value="ONLINE">Online</option>
              </Select>
              {row.original.receiptId ? (
                <Button asChild variant="outline" size="sm">
                  <Link href={`/payments/receipts/${row.original.receiptId}`}>
                    <ReceiptText className="h-4 w-4" />
                    Receipt
                  </Link>
                </Button>
              ) : (
                <Button size="sm" onClick={() => submit(row.original)} disabled={isPending || row.original.status === "PAID"}>
                  {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Pay
                </Button>
              )}
            </div>
          );
        }
      }
    ];

  // TanStack Table intentionally returns function-heavy instances that React Compiler cannot memoize.
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: filteredRows,
    columns,
    state: { globalFilter },
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel()
  });

  return (
    <Card className="glass-panel">
      <CardContent className="p-6">
        <div className="mb-6 flex flex-col justify-between gap-4 xl:flex-row xl:items-center">
          <div>
            <Badge variant="secondary">Auto-calculated dues</Badge>
            <h2 className="mt-3 text-2xl font-semibold">Due payments</h2>
            <p className="mt-1 text-sm text-muted-foreground">Monthly dues are calculated from active class enrollment and course fees.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <Input type="month" value={selectedMonth} onChange={(event) => setSelectedMonth(event.target.value)} />
            <Select value={classFilter} onChange={(event) => setClassFilter(event.target.value)}>
              <option value="ALL">All classes</option>
              {classes.map((classGroup) => (
                <option key={classGroup.id} value={classGroup.id}>
                  {classGroup.name}
                </option>
              ))}
            </Select>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={globalFilter} onChange={(event) => setGlobalFilter(event.target.value)} placeholder="Search..." className="pl-9" />
            </div>
          </div>
        </div>

        <div className="mb-6 grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-2xl border bg-white/72 p-4">
            <div className="mb-4">
              <h3 className="font-semibold">Find student by NFC or QR</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Tap an NFC card or scan a student QR token to instantly locate due rows before marking payment.
              </p>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-xl border bg-white/80 p-3">
                <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
                  <Radio className="h-4 w-4 text-teal-700" />
                  NFC card tap
                </div>
                <div className="flex gap-2">
                  <Input
                    value={nfcUid}
                    onChange={(event) => setNfcUid(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        findByCredential("nfc");
                      }
                    }}
                    placeholder="NFC UID"
                  />
                  <Button onClick={() => findByCredential("nfc")}>
                    <Radio className="h-4 w-4" />
                    Find
                  </Button>
                </div>
              </div>
              <div className="rounded-xl border bg-white/80 p-3">
                <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
                  <QrCode className="h-4 w-4 text-primary" />
                  QR scan
                </div>
                <div className="flex gap-2">
                  <Input
                    value={qrToken}
                    onChange={(event) => setQrToken(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        findByCredential("qr");
                      }
                    }}
                    placeholder="Secure QR token"
                  />
                  <Button variant="outline" onClick={() => findByCredential("qr")}>
                    <QrCode className="h-4 w-4" />
                    Scan
                  </Button>
                </div>
              </div>
            </div>
          </div>
          <div
            className={`rounded-2xl border p-4 ${
              scanResult?.ok ? "bg-emerald-50 text-emerald-950" : scanResult ? "bg-amber-50 text-amber-950" : "bg-white/72"
            }`}
          >
            {scanResult ? (
              <div className="flex h-full flex-col justify-between gap-4">
                <div className="flex items-start gap-3">
                  {scanResult.ok ? <CheckCircle2 className="h-6 w-6 text-emerald-700" /> : <ShieldAlert className="h-6 w-6 text-amber-700" />}
                  <div>
                    <p className="font-semibold">{scanResult.title}</p>
                    <p className="mt-1 text-sm">{scanResult.detail}</p>
                  </div>
                </div>
                {scanResult.studentId ? (
                  <Button asChild variant="outline" className="bg-white/80">
                    <Link href={`/payments/students/${scanResult.studentId}`}>Open student ledger</Link>
                  </Button>
                ) : null}
              </div>
            ) : (
              <div className="flex h-full min-h-[132px] flex-col items-center justify-center text-center">
                <Search className="h-8 w-8 text-muted-foreground" />
                <p className="mt-3 font-semibold">Waiting for scan</p>
                <p className="mt-1 text-sm text-muted-foreground">Matched student details will appear here.</p>
              </div>
            )}
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border bg-white/75">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1120px] text-sm">
              <thead className="bg-muted/70">
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <th key={header.id} className="px-4 py-3 text-left font-semibold text-muted-foreground">
                        {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody>
                {table.getRowModel().rows.length ? (
                  table.getRowModel().rows.map((row) => (
                    <tr
                      key={row.id}
                      className={`border-t transition hover:bg-muted/40 ${
                        highlightedStudentId === row.original.studentId ? "bg-emerald-50 ring-1 ring-inset ring-emerald-200" : ""
                      }`}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <td key={cell.id} className="px-4 py-4">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={columns.length} className="px-4 py-14 text-center">
                      <p className="font-semibold">No due payments found</p>
                      <p className="mt-1 text-sm text-muted-foreground">Adjust class/month filters or enroll students in classes.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
