"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  useReactTable
} from "@tanstack/react-table";
import { useForm } from "react-hook-form";
import { Eye, Loader2, Pencil, Plus, Radio, Search, Trash2, UserRound, X } from "lucide-react";
import { toast } from "sonner";
import { createStudent, deleteStudent, updateStudent } from "@/app/(dashboard)/students/actions";
import { FieldRow, FormField, FormShell } from "@/components/forms/form-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { studentSchema, type StudentInput } from "@/lib/validations";
import { formatCurrency } from "@/lib/utils";

type WebNfcReadingEvent = Event & {
  serialNumber?: string;
};

type WebNfcReader = {
  scan: (options?: { signal?: AbortSignal }) => Promise<void>;
  onreading: ((event: WebNfcReadingEvent) => void) | null;
  onreadingerror: (() => void) | null;
};

declare global {
  interface Window {
    NDEFReader?: new () => WebNfcReader;
  }
}

export type StudentRow = {
  id: string;
  admissionNo: string;
  firstName: string;
  lastName: string;
  name: string;
  email: string | null;
  phone: string | null;
  dateOfBirth: string;
  status: "ACTIVE" | "PAUSED" | "GRADUATED" | "ARCHIVED";
  avatarUrl: string | null;
  nfcUid: string | null;
  qrCode: string | null;
  branchId: string;
  branch: string;
  classes: string;
  parentName: string;
  parentRelationship: "Father" | "Mother" | "Guardian" | "Other";
  parentEmail: string | null;
  parentPhone: string;
  parentNic: string | null;
  parentAddress: string | null;
  parentAppLogin: string;
  emergencyContactNumber: string;
  parentOccupation: string | null;
  pendingAmount: number;
  paidAmount: number;
  attendanceRate: number;
};

export type BranchOption = {
  id: string;
  name: string;
};

const emptyStudent: StudentInput = {
  admissionNo: "",
  firstName: "",
  lastName: "",
  email: undefined,
  phone: undefined,
  dateOfBirth: undefined,
  status: "ACTIVE",
  avatarUrl: undefined,
  nfcUid: undefined,
  qrCode: undefined,
  branchId: "",
  parentName: "",
  parentRelationship: "Guardian",
  parentEmail: undefined,
  parentPhone: "",
  parentNic: undefined,
  parentAddress: undefined,
  parentAppLogin: "",
  emergencyContactNumber: "",
  parentOccupation: undefined
};

function rowToInput(row: StudentRow): StudentInput {
  return {
    admissionNo: row.admissionNo,
    firstName: row.firstName,
    lastName: row.lastName,
    email: row.email ?? undefined,
    phone: row.phone ?? undefined,
    dateOfBirth: row.dateOfBirth || undefined,
    status: row.status,
    avatarUrl: row.avatarUrl ?? undefined,
    nfcUid: row.nfcUid ?? undefined,
    qrCode: row.qrCode ?? undefined,
    branchId: row.branchId,
    parentName: row.parentName,
    parentRelationship: row.parentRelationship,
    parentEmail: row.parentEmail ?? undefined,
    parentPhone: row.parentPhone,
    parentNic: row.parentNic ?? undefined,
    parentAddress: row.parentAddress ?? undefined,
    parentAppLogin: row.parentAppLogin,
    emergencyContactNumber: row.emergencyContactNumber,
    parentOccupation: row.parentOccupation ?? undefined
  };
}

export function StudentsTable({ data, branches, currency }: { data: StudentRow[]; branches: BranchOption[]; currency: string }) {
  const [globalFilter, setGlobalFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [editing, setEditing] = useState<StudentRow | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [deleting, setDeleting] = useState<StudentRow | null>(null);
  const [isPending, startTransition] = useTransition();

  const filteredData = useMemo(
    () => (statusFilter === "ALL" ? data : data.filter((student) => student.status === statusFilter)),
    [data, statusFilter]
  );

  const columns = useMemo<ColumnDef<StudentRow>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Student",
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-white">
              {row.original.avatarUrl ? <span className="text-xs">IMG</span> : <UserRound className="h-5 w-5" />}
            </div>
            <div>
              <Link href={`/students/${row.original.id}`} className="font-semibold hover:underline">
                {row.original.name}
              </Link>
              <p className="text-xs text-muted-foreground">{row.original.admissionNo}</p>
            </div>
          </div>
        )
      },
      { accessorKey: "classes", header: "Assigned classes" },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => <StatusBadge status={row.original.status} />
      },
      {
        accessorKey: "pendingAmount",
        header: "Payments",
        cell: ({ row }) => (
          <div>
            <p className="font-semibold">{formatCurrency(row.original.pendingAmount, currency)}</p>
            <p className="text-xs text-muted-foreground">pending</p>
          </div>
        )
      },
      {
        accessorKey: "attendanceRate",
        header: "Attendance",
        cell: ({ row }) => <span className="font-semibold">{row.original.attendanceRate}%</span>
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <div className="flex justify-end gap-2">
            <Button asChild variant="ghost" size="icon" aria-label="View student">
              <Link href={`/students/${row.original.id}`}>
                <Eye className="h-4 w-4" />
              </Link>
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setEditing(row.original)} aria-label="Edit student">
              <Pencil className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setDeleting(row.original)} aria-label="Delete student">
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        )
      }
    ],
    [currency]
  );

  // TanStack Table intentionally returns function-heavy instances that React Compiler cannot memoize.
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: filteredData,
    columns,
    state: { globalFilter },
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel()
  });

  function confirmDelete() {
    if (!deleting) {
      return;
    }

    startTransition(async () => {
      const result = await deleteStudent(deleting.id);
      if (result.ok) {
        toast.success(result.message);
        setDeleting(null);
      } else {
        toast.error(result.message);
      }
    });
  }

  return (
    <>
      <Card className="glass-panel">
        <CardContent className="p-6">
          <div className="mb-6 flex flex-col justify-between gap-4 xl:flex-row xl:items-center">
            <div>
              <Badge variant="secondary">Student intelligence</Badge>
              <h2 className="mt-3 text-2xl font-semibold">Students</h2>
              <p className="mt-1 text-sm text-muted-foreground">Manage profiles, guardians, identifiers, classes, attendance, and fee signals.</p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="relative min-w-[260px]">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input value={globalFilter} onChange={(event) => setGlobalFilter(event.target.value)} placeholder="Search students..." className="pl-9" />
              </div>
              <Select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="sm:w-[170px]">
                <option value="ALL">All statuses</option>
                <option value="ACTIVE">Active</option>
                <option value="PAUSED">Paused</option>
                <option value="GRADUATED">Graduated</option>
                <option value="ARCHIVED">Archived</option>
              </Select>
              <Button onClick={() => setIsCreating(true)}>
                <Plus className="h-4 w-4" />
                Add student
              </Button>
            </div>
          </div>

          <DataTable table={table} columns={columns} />
        </CardContent>
      </Card>

      {isCreating ? (
        <StudentPanel
          title="Add student"
          branches={branches}
          defaultValues={{ ...emptyStudent, branchId: branches[0]?.id ?? "" }}
          onClose={() => setIsCreating(false)}
          onSubmit={async (values) => createStudent(values)}
        />
      ) : null}

      {editing ? (
        <StudentPanel
          title="Edit student"
          branches={branches}
          defaultValues={rowToInput(editing)}
          onClose={() => setEditing(null)}
          onSubmit={async (values) => updateStudent(editing.id, values)}
        />
      ) : null}

      {deleting ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-primary/35 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border bg-white p-6 shadow-luxury">
            <h3 className="text-lg font-semibold">Delete {deleting.name}?</h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              This removes the student profile, enrollments, attendance records, and payment links for this workspace.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <Button variant="outline" onClick={() => setDeleting(null)} disabled={isPending}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={confirmDelete} disabled={isPending}>
                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                Delete
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function StudentPanel({
  title,
  branches,
  defaultValues,
  onClose,
  onSubmit
}: {
  title: string;
  branches: BranchOption[];
  defaultValues: StudentInput;
  onClose: () => void;
  onSubmit: (values: StudentInput) => Promise<{ ok: boolean; message: string }>;
}) {
  const [isPending, startTransition] = useTransition();
  const [nfcScanning, setNfcScanning] = useState(false);
  const form = useForm<StudentInput>({
    resolver: zodResolver(studentSchema),
    defaultValues
  });

  async function scanWebNfcCard() {
    if (typeof window === "undefined" || !window.NDEFReader) {
      toast.error("Web NFC is not available in this browser. Use the mobile app or enter the UID manually.");
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 20000);

    setNfcScanning(true);

    try {
      const reader = new window.NDEFReader();
      await reader.scan({ signal: controller.signal });
      toast.info("Hold the NFC card near this device.");

      reader.onreading = (event) => {
        window.clearTimeout(timeout);
        controller.abort();
        setNfcScanning(false);

        if (!event.serialNumber) {
          toast.error("Card was read, but the browser did not expose a serial number.");
          return;
        }

        form.setValue("nfcUid", event.serialNumber, { shouldDirty: true, shouldValidate: true });
        toast.success("NFC UID captured.");
      };

      reader.onreadingerror = () => {
        window.clearTimeout(timeout);
        controller.abort();
        setNfcScanning(false);
        toast.error("Could not read NFC card. Try again or enter the UID manually.");
      };
    } catch (error) {
      window.clearTimeout(timeout);
      setNfcScanning(false);
      toast.error(error instanceof Error ? error.message : "Could not start Web NFC scan.");
    }
  }

  function submit(values: StudentInput) {
    startTransition(async () => {
      const result = await onSubmit(values);
      if (result.ok) {
        toast.success(result.message);
        onClose();
      } else {
        toast.error(result.message);
      }
    });
  }

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-primary/35 backdrop-blur-sm">
      <button className="absolute inset-0" aria-label="Close student form" onClick={onClose} />
      <div className="absolute right-0 top-0 h-full w-full max-w-3xl overflow-y-auto border-l bg-background p-5 shadow-luxury sm:p-7">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <Badge variant="secondary">Student record</Badge>
            <h2 className="mt-3 text-2xl font-semibold">{title}</h2>
          </div>
          <Button variant="outline" size="icon" onClick={onClose} aria-label="Close">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <form onSubmit={form.handleSubmit(submit)} className="space-y-5">
          <FormShell title="Student details" description="Core identity, branch assignment, and access identifiers.">
            <div className="space-y-4">
              <FieldRow>
                <FormField label="Admission number" error={form.formState.errors.admissionNo?.message}>
                  <Input {...form.register("admissionNo")} />
                </FormField>
                <FormField label="Branch" error={form.formState.errors.branchId?.message}>
                  <Select {...form.register("branchId")}>
                    {branches.map((branch) => (
                      <option key={branch.id} value={branch.id}>
                        {branch.name}
                      </option>
                    ))}
                  </Select>
                </FormField>
              </FieldRow>
              <FieldRow>
                <FormField label="First name" error={form.formState.errors.firstName?.message}>
                  <Input {...form.register("firstName")} />
                </FormField>
                <FormField label="Last name" error={form.formState.errors.lastName?.message}>
                  <Input {...form.register("lastName")} />
                </FormField>
              </FieldRow>
              <FieldRow>
                <FormField label="Email" error={form.formState.errors.email?.message}>
                  <Input type="email" {...form.register("email")} />
                </FormField>
                <FormField label="Phone" error={form.formState.errors.phone?.message}>
                  <Input {...form.register("phone")} />
                </FormField>
              </FieldRow>
              <FieldRow>
                <FormField label="Date of birth" error={form.formState.errors.dateOfBirth?.message}>
                  <Input type="date" {...form.register("dateOfBirth")} />
                </FormField>
                <FormField label="Status" error={form.formState.errors.status?.message}>
                  <Select {...form.register("status")}>
                    <option value="ACTIVE">Active</option>
                    <option value="PAUSED">Paused</option>
                    <option value="GRADUATED">Graduated</option>
                    <option value="ARCHIVED">Archived</option>
                  </Select>
                </FormField>
              </FieldRow>
              <FieldRow>
                <FormField label="NFC UID" error={form.formState.errors.nfcUid?.message}>
                  <div className="flex gap-2">
                    <Input placeholder="04:A1:..." {...form.register("nfcUid")} />
                    <Button type="button" variant="outline" onClick={scanWebNfcCard} disabled={nfcScanning}>
                      {nfcScanning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Radio className="h-4 w-4" />}
                      Read
                    </Button>
                  </div>
                </FormField>
                <FormField label="QR code" error={form.formState.errors.qrCode?.message}>
                  <Input placeholder="QR-STUDENT-1001" {...form.register("qrCode")} />
                </FormField>
              </FieldRow>
              <FormField label="Photo URL placeholder" error={form.formState.errors.avatarUrl?.message}>
                <Input placeholder="Optional image URL" {...form.register("avatarUrl")} />
              </FormField>
            </div>
          </FormShell>

          <FormShell title="Parent / guardian" description="Primary guardian contact displayed on the student profile.">
            <div className="space-y-4">
              <FieldRow>
                <FormField label="Guardian name" error={form.formState.errors.parentName?.message}>
                  <Input {...form.register("parentName")} />
                </FormField>
                <FormField label="Relationship" error={form.formState.errors.parentRelationship?.message}>
                  <Select {...form.register("parentRelationship")}>
                    <option value="Father">Father</option>
                    <option value="Mother">Mother</option>
                    <option value="Guardian">Guardian</option>
                    <option value="Other">Other</option>
                  </Select>
                </FormField>
              </FieldRow>
              <FieldRow>
                <FormField label="Guardian phone" error={form.formState.errors.parentPhone?.message}>
                  <Input {...form.register("parentPhone")} />
                </FormField>
                <FormField label="Emergency contact" error={form.formState.errors.emergencyContactNumber?.message}>
                  <Input {...form.register("emergencyContactNumber")} />
                </FormField>
              </FieldRow>
              <FieldRow>
                <FormField label="Guardian email" error={form.formState.errors.parentEmail?.message}>
                  <Input type="email" {...form.register("parentEmail")} />
                </FormField>
                <FormField label="Parent app login mobile/email" error={form.formState.errors.parentAppLogin?.message}>
                  <Input {...form.register("parentAppLogin")} />
                </FormField>
              </FieldRow>
              <FieldRow>
                <FormField label="Parent NIC" error={form.formState.errors.parentNic?.message}>
                  <Input {...form.register("parentNic")} />
                </FormField>
                <FormField label="Occupation" error={form.formState.errors.parentOccupation?.message}>
                  <Input {...form.register("parentOccupation")} />
                </FormField>
              </FieldRow>
              <FormField label="Parent address" error={form.formState.errors.parentAddress?.message}>
                <Input {...form.register("parentAddress")} />
              </FormField>
            </div>
          </FormShell>

          <div className="sticky bottom-0 flex justify-end gap-3 border-t bg-background/92 py-4 backdrop-blur">
            <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Save student
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function DataTable<TData>({
  table,
  columns
}: {
  table: ReturnType<typeof useReactTable<TData>>;
  columns: ColumnDef<TData>[];
}) {
  return (
    <>
      <div className="overflow-hidden rounded-xl border bg-white/75">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-sm">
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
                  <tr key={row.id} className="border-t transition hover:bg-muted/40">
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
                    <p className="font-semibold">No students found</p>
                    <p className="mt-1 text-sm text-muted-foreground">Create a student or adjust your filters.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount() || 1}
        </p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
            Previous
          </Button>
          <Button variant="outline" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
            Next
          </Button>
        </div>
      </div>
    </>
  );
}

function StatusBadge({ status }: { status: StudentRow["status"] }) {
  const variant = status === "ACTIVE" ? "success" : status === "PAUSED" ? "warning" : "outline";
  return <Badge variant={variant}>{status.toLowerCase()}</Badge>;
}
