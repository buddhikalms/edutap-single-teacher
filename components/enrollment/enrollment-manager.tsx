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
import { useForm, useWatch } from "react-hook-form";
import { Loader2, Plus, Search, Trash2, UserPlus, X } from "lucide-react";
import { toast } from "sonner";
import { assignEnrollment, bulkAssignEnrollment, removeEnrollment, setEnrollmentStatus } from "@/app/(dashboard)/enrollment/actions";
import { FieldRow, FormField, FormShell } from "@/components/forms/form-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { bulkEnrollmentSchema, enrollmentSchema, type BulkEnrollmentInput, type EnrollmentInput } from "@/lib/validations";

export type EnrollmentRow = {
  id: string;
  studentId: string;
  student: string;
  admissionNo: string;
  classGroupId: string;
  classGroup: string;
  course: string;
  teacher: string;
  active: boolean;
  status: "ACTIVE" | "INACTIVE" | "LOCKED" | "DELETED";
  paymentStartDate: string;
  freePeriodType: "NONE" | "FIRST_WEEK" | "SECOND_WEEK" | "FIRST_MONTH" | "CUSTOM_DAYS";
  freeDays: number;
  monthlyFeeOverride: number | null;
  discount: number;
  enrolledAt: string;
};

export type EnrollmentOption = {
  id: string;
  name: string;
  meta?: string;
  monthlyFee?: number;
  defaultFreePeriodType?: "NONE" | "FIRST_WEEK" | "SECOND_WEEK" | "FIRST_MONTH" | "CUSTOM_DAYS";
  defaultFreeDays?: number;
};

function todayInput() {
  return new Date().toISOString().slice(0, 10);
}

function classDefaults(classes: EnrollmentOption[], classGroupId: string) {
  const selected = classes.find((classGroup) => classGroup.id === classGroupId);
  return {
    monthlyFeeOverride: selected?.monthlyFee ?? 0,
    freePeriodType: selected?.defaultFreePeriodType ?? "NONE",
    freeDays: selected?.defaultFreeDays ?? 0
  };
}

export function EnrollmentManager({
  enrollments,
  students,
  classes
}: {
  enrollments: EnrollmentRow[];
  students: EnrollmentOption[];
  classes: EnrollmentOption[];
}) {
  const [globalFilter, setGlobalFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [singlePanel, setSinglePanel] = useState(false);
  const [bulkPanel, setBulkPanel] = useState(false);
  const [removing, setRemoving] = useState<EnrollmentRow | null>(null);
  const [isPending, startTransition] = useTransition();

  const filtered = useMemo(
    () => (statusFilter === "ALL" ? enrollments : enrollments.filter((enrollment) => enrollment.active === (statusFilter === "ACTIVE"))),
    [enrollments, statusFilter]
  );

  const columns = useMemo<ColumnDef<EnrollmentRow>[]>(
    () => [
      {
        accessorKey: "student",
        header: "Student",
        cell: ({ row }) => (
          <div>
            <Link href={`/students/${row.original.studentId}`} className="font-semibold hover:underline">
              {row.original.student}
            </Link>
            <p className="text-xs text-muted-foreground">{row.original.admissionNo}</p>
          </div>
        )
      },
      {
        accessorKey: "classGroup",
        header: "Class",
        cell: ({ row }) => (
          <div>
            <Link href={`/classes/${row.original.classGroupId}`} className="font-semibold hover:underline">
              {row.original.classGroup}
            </Link>
            <p className="text-xs text-muted-foreground">{row.original.course}</p>
          </div>
        )
      },
      { accessorKey: "teacher", header: "Teacher" },
      {
        accessorKey: "paymentStartDate",
        header: "Payment start",
        cell: ({ row }) => (
          <div>
            <p className="font-semibold">{row.original.paymentStartDate || "Today"}</p>
            <p className="text-xs text-muted-foreground">{row.original.freePeriodType.toLowerCase().replaceAll("_", " ")}</p>
          </div>
        )
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => <Badge variant={row.original.status === "ACTIVE" ? "success" : "outline"}>{row.original.status.toLowerCase()}</Badge>
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                startTransition(async () => {
                  const result = await setEnrollmentStatus(row.original.id, !row.original.active);
                  if (result.ok) {
                    toast.success(result.message);
                  } else {
                    toast.error(result.message);
                  }
                })
              }
            >
              {row.original.active ? "Mark inactive" : "Activate"}
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setRemoving(row.original)} aria-label="Remove enrollment">
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        )
      }
    ],
    [startTransition]
  );

  // TanStack Table intentionally returns function-heavy instances that React Compiler cannot memoize.
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: filtered,
    columns,
    state: { globalFilter },
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel()
  });

  function confirmRemove() {
    if (!removing) {
      return;
    }

    startTransition(async () => {
      const result = await removeEnrollment(removing.id);
      if (result.ok) {
        toast.success(result.message);
        setRemoving(null);
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
              <Badge variant="secondary">Enrollment control</Badge>
              <h2 className="mt-3 text-2xl font-semibold">Enrollment</h2>
              <p className="mt-1 text-sm text-muted-foreground">Assign students manually, bulk assign, and control active enrollment state.</p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button variant="outline" onClick={() => setBulkPanel(true)}>
                <UserPlus className="h-4 w-4" />
                Bulk assign
              </Button>
              <Button onClick={() => setSinglePanel(true)}>
                <Plus className="h-4 w-4" />
                Assign student
              </Button>
            </div>
          </div>

          <div className="mb-5 flex flex-col gap-3 md:flex-row">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={globalFilter} onChange={(event) => setGlobalFilter(event.target.value)} placeholder="Search enrollments..." className="pl-9" />
            </div>
            <Select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="md:w-[180px]">
              <option value="ALL">All statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </Select>
          </div>

          <EnrollmentDataTable table={table} columns={columns} />
        </CardContent>
      </Card>

      {singlePanel ? <SingleEnrollmentPanel students={students} classes={classes} onClose={() => setSinglePanel(false)} /> : null}
      {bulkPanel ? <BulkEnrollmentPanel students={students} classes={classes} onClose={() => setBulkPanel(false)} /> : null}

      {removing ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-primary/35 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border bg-white p-6 shadow-luxury">
            <h3 className="text-lg font-semibold">Remove enrollment?</h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {removing.student} will be removed from {removing.classGroup}.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <Button variant="outline" onClick={() => setRemoving(null)} disabled={isPending}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={confirmRemove} disabled={isPending}>
                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                Remove
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function SingleEnrollmentPanel({ students, classes, onClose }: { students: EnrollmentOption[]; classes: EnrollmentOption[]; onClose: () => void }) {
  const [isPending, startTransition] = useTransition();
  const initialClassId = classes[0]?.id ?? "";
  const defaults = classDefaults(classes, initialClassId);
  const form = useForm<EnrollmentInput>({
    resolver: zodResolver(enrollmentSchema),
    defaultValues: {
      studentId: students[0]?.id ?? "",
      classGroupId: initialClassId,
      active: true,
      status: "ACTIVE",
      paymentStartDate: todayInput(),
      ...defaults,
      discount: 0
    }
  });
  const selectedClassId = useWatch({ control: form.control, name: "classGroupId" });

  function submit(values: EnrollmentInput) {
    startTransition(async () => {
      const result = await assignEnrollment(values);
      if (result.ok) {
        toast.success(result.message);
        onClose();
      } else {
        toast.error(result.message);
      }
    });
  }

  return (
    <Panel title="Assign student" onClose={onClose}>
      <form onSubmit={form.handleSubmit(submit)} className="space-y-5">
        <FormShell title="Manual assignment" description="Assign one student to one class. Existing enrollment will be reactivated or updated.">
          <div className="space-y-4">
            <FieldRow>
              <FormField label="Student" error={form.formState.errors.studentId?.message}>
                <Select {...form.register("studentId")}>
                  {students.map((student) => (
                    <option key={student.id} value={student.id}>
                      {student.name}
                    </option>
                  ))}
                </Select>
              </FormField>
              <FormField label="Class" error={form.formState.errors.classGroupId?.message}>
                <Select
                  {...form.register("classGroupId")}
                  onChange={(event) => {
                    form.register("classGroupId").onChange(event);
                    const nextDefaults = classDefaults(classes, event.target.value);
                    form.setValue("monthlyFeeOverride", nextDefaults.monthlyFeeOverride);
                    form.setValue("freePeriodType", nextDefaults.freePeriodType);
                    form.setValue("freeDays", nextDefaults.freeDays);
                  }}
                >
                  {classes.map((classGroup) => (
                    <option key={classGroup.id} value={classGroup.id}>
                      {classGroup.name}
                    </option>
                  ))}
                </Select>
              </FormField>
            </FieldRow>
            <FieldRow>
              <FormField label="Status" error={form.formState.errors.status?.message}>
                <Select {...form.register("status")}>
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                  <option value="LOCKED">Locked</option>
                  <option value="DELETED">Deleted</option>
                </Select>
              </FormField>
              <FormField label="Payment start date" error={form.formState.errors.paymentStartDate?.message}>
                <Input type="date" {...form.register("paymentStartDate")} />
              </FormField>
            </FieldRow>
            <FieldRow>
              <FormField label="Free period" error={form.formState.errors.freePeriodType?.message}>
                <Select {...form.register("freePeriodType")}>
                  <option value="NONE">No free period</option>
                  <option value="FIRST_WEEK">First week free</option>
                  <option value="SECOND_WEEK">Second week free</option>
                  <option value="FIRST_MONTH">First month free</option>
                  <option value="CUSTOM_DAYS">Custom free days</option>
                </Select>
              </FormField>
              <FormField label="Free days" error={form.formState.errors.freeDays?.message}>
                <Input type="number" min={0} {...form.register("freeDays")} />
              </FormField>
            </FieldRow>
            <FieldRow>
              <FormField label="Monthly fee override" error={form.formState.errors.monthlyFeeOverride?.message}>
                <Input type="number" step="0.01" {...form.register("monthlyFeeOverride")} />
              </FormField>
              <FormField label="Discount" error={form.formState.errors.discount?.message}>
                <Input type="number" step="0.01" {...form.register("discount")} />
              </FormField>
            </FieldRow>
            <p className="text-xs text-muted-foreground">
              Class default fee: {classes.find((classGroup) => classGroup.id === selectedClassId)?.monthlyFee ?? 0}
            </p>
            <label className="flex items-center gap-3 rounded-xl border bg-white/70 p-4">
              <Checkbox defaultChecked {...form.register("active")} />
              <span className="text-sm font-semibold">Set enrollment active</span>
            </label>
          </div>
        </FormShell>
        <PanelActions onClose={onClose} isPending={isPending} label="Save enrollment" />
      </form>
    </Panel>
  );
}

function BulkEnrollmentPanel({ students, classes, onClose }: { students: EnrollmentOption[]; classes: EnrollmentOption[]; onClose: () => void }) {
  const [isPending, startTransition] = useTransition();
  const initialClassId = classes[0]?.id ?? "";
  const defaults = classDefaults(classes, initialClassId);
  const form = useForm<BulkEnrollmentInput>({
    resolver: zodResolver(bulkEnrollmentSchema),
    defaultValues: {
      studentIds: [],
      classGroupId: initialClassId,
      active: true,
      status: "ACTIVE",
      paymentStartDate: todayInput(),
      ...defaults,
      discount: 0
    }
  });
  const selected = useWatch({ control: form.control, name: "studentIds" }) ?? [];

  function toggleStudent(id: string, checked: boolean) {
    form.setValue("studentIds", checked ? [...selected, id] : selected.filter((studentId) => studentId !== id), { shouldValidate: true });
  }

  function submit(values: BulkEnrollmentInput) {
    startTransition(async () => {
      const result = await bulkAssignEnrollment(values);
      if (result.ok) {
        toast.success(result.message);
        onClose();
      } else {
        toast.error(result.message);
      }
    });
  }

  return (
    <Panel title="Bulk assign students" onClose={onClose}>
      <form onSubmit={form.handleSubmit(submit)} className="space-y-5">
        <FormShell title="Bulk assignment" description="Choose one class and assign multiple students at once.">
          <div className="space-y-4">
            <FormField label="Class" error={form.formState.errors.classGroupId?.message}>
              <Select
                {...form.register("classGroupId")}
                onChange={(event) => {
                  form.register("classGroupId").onChange(event);
                  const nextDefaults = classDefaults(classes, event.target.value);
                  form.setValue("monthlyFeeOverride", nextDefaults.monthlyFeeOverride);
                  form.setValue("freePeriodType", nextDefaults.freePeriodType);
                  form.setValue("freeDays", nextDefaults.freeDays);
                }}
              >
                {classes.map((classGroup) => (
                  <option key={classGroup.id} value={classGroup.id}>
                    {classGroup.name}
                  </option>
                ))}
              </Select>
            </FormField>
            <FieldRow>
              <FormField label="Status" error={form.formState.errors.status?.message}>
                <Select {...form.register("status")}>
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                  <option value="LOCKED">Locked</option>
                  <option value="DELETED">Deleted</option>
                </Select>
              </FormField>
              <FormField label="Payment start date" error={form.formState.errors.paymentStartDate?.message}>
                <Input type="date" {...form.register("paymentStartDate")} />
              </FormField>
            </FieldRow>
            <FieldRow>
              <FormField label="Free period" error={form.formState.errors.freePeriodType?.message}>
                <Select {...form.register("freePeriodType")}>
                  <option value="NONE">No free period</option>
                  <option value="FIRST_WEEK">First week free</option>
                  <option value="SECOND_WEEK">Second week free</option>
                  <option value="FIRST_MONTH">First month free</option>
                  <option value="CUSTOM_DAYS">Custom free days</option>
                </Select>
              </FormField>
              <FormField label="Free days" error={form.formState.errors.freeDays?.message}>
                <Input type="number" min={0} {...form.register("freeDays")} />
              </FormField>
            </FieldRow>
            <FieldRow>
              <FormField label="Monthly fee override" error={form.formState.errors.monthlyFeeOverride?.message}>
                <Input type="number" step="0.01" {...form.register("monthlyFeeOverride")} />
              </FormField>
              <FormField label="Discount" error={form.formState.errors.discount?.message}>
                <Input type="number" step="0.01" {...form.register("discount")} />
              </FormField>
            </FieldRow>
            <div className="grid max-h-[360px] gap-3 overflow-y-auto pr-1">
              {students.map((student) => (
                <label key={student.id} className="flex items-center justify-between gap-4 rounded-xl border bg-white/70 p-4">
                  <span>
                    <span className="block font-semibold">{student.name}</span>
                    <span className="text-xs text-muted-foreground">{student.meta}</span>
                  </span>
                  <Checkbox checked={selected.includes(student.id)} onChange={(event) => toggleStudent(student.id, event.target.checked)} />
                </label>
              ))}
            </div>
            {form.formState.errors.studentIds ? <p className="text-sm text-destructive">{form.formState.errors.studentIds.message}</p> : null}
            <label className="flex items-center gap-3 rounded-xl border bg-white/70 p-4">
              <Checkbox defaultChecked {...form.register("active")} />
              <span className="text-sm font-semibold">Set enrollments active</span>
            </label>
          </div>
        </FormShell>
        <PanelActions onClose={onClose} isPending={isPending} label="Bulk assign" />
      </form>
    </Panel>
  );
}

function Panel({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-primary/35 backdrop-blur-sm">
      <button className="absolute inset-0" aria-label="Close enrollment panel" onClick={onClose} />
      <div className="absolute right-0 top-0 h-full w-full max-w-2xl overflow-y-auto border-l bg-background p-5 shadow-luxury sm:p-7">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <Badge variant="secondary">Enrollment</Badge>
            <h2 className="mt-3 text-2xl font-semibold">{title}</h2>
          </div>
          <Button variant="outline" size="icon" onClick={onClose} aria-label="Close">
            <X className="h-4 w-4" />
          </Button>
        </div>
        {children}
      </div>
    </div>
  );
}

function PanelActions({ onClose, isPending, label }: { onClose: () => void; isPending: boolean; label: string }) {
  return (
    <div className="sticky bottom-0 flex justify-end gap-3 border-t bg-background/92 py-4 backdrop-blur">
      <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
        Cancel
      </Button>
      <Button type="submit" disabled={isPending}>
        {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        {label}
      </Button>
    </div>
  );
}

function EnrollmentDataTable<TData>({ table, columns }: { table: ReturnType<typeof useReactTable<TData>>; columns: ColumnDef<TData>[] }) {
  return (
    <>
      <div className="overflow-hidden rounded-xl border bg-white/75">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] text-sm">
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
                    <p className="font-semibold">No enrollments found</p>
                    <p className="mt-1 text-sm text-muted-foreground">Assign students to classes to build enrollment history.</p>
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
