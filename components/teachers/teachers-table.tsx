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
import { Eye, Globe2, Loader2, Pencil, Plus, Search, Trash2, UserRound, X } from "lucide-react";
import { toast } from "sonner";
import { createTeacher, deleteTeacher, updateTeacher } from "@/app/(dashboard)/teachers/actions";
import { FieldRow, FormField, FormShell } from "@/components/forms/form-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { formatCurrency } from "@/lib/utils";
import { teacherSchema, type TeacherInput } from "@/lib/validations";

export type TeacherRow = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  username: string | null;
  slug: string;
  status: "ACTIVE" | "INACTIVE";
  specialty: string | null;
  bio: string | null;
  qualifications: string | null;
  subjects: string;
  gradesTaught: string;
  photoUrl: string | null;
  accentColor: string;
  heroImage: string | null;
  logoUrl: string | null;
  commissionRate: number;
  grossRevenue: number;
  commissionDue: number;
  branchId: string;
  branch: string;
  classGroupIds: string[];
  classes: string;
  activeClasses: number;
  students: number;
  courses: number;
  enrollmentRequests: number;
  permissions: TeacherInput["permissions"];
};

export type TeacherClassOption = {
  id: string;
  name: string;
  teacherId: string | null;
};

export type TeacherBranchOption = {
  id: string;
  name: string;
};

const emptyTeacher: TeacherInput = {
  name: "",
  email: "",
  phone: undefined,
  username: undefined,
  password: undefined,
  sendCredentialsSms: true,
  slug: "",
  status: "ACTIVE",
  specialty: undefined,
  bio: undefined,
  qualifications: undefined,
  subjects: undefined,
  gradesTaught: undefined,
  photoUrl: undefined,
  accentColor: "#0f766e",
  heroImage: undefined,
  logoUrl: undefined,
  commissionRate: 0,
  branchId: "",
  permissions: {
    canCreateStudents: true,
    canEditStudents: true,
    canDeleteStudents: false,
    canCreateClasses: true,
    canEditClasses: true,
    canManageAttendance: true,
    canManagePayments: false,
    canVerifyPayments: false,
    canCreateCourses: true,
    canUploadResources: true,
    canManageHomework: true,
    canManageQuizzes: true,
    canSendNotifications: true,
    canSendSms: false,
    canExportStudentData: false,
    canManageStudentCards: true,
    canViewFinancialReports: false
  },
  classGroupIds: []
};

const permissionFields: Array<{ name: keyof TeacherInput["permissions"]; label: string }> = [
  { name: "canCreateStudents", label: "Create students" },
  { name: "canEditStudents", label: "Edit students" },
  { name: "canDeleteStudents", label: "Delete students" },
  { name: "canCreateClasses", label: "Create classes" },
  { name: "canEditClasses", label: "Edit classes" },
  { name: "canManageAttendance", label: "Manage attendance" },
  { name: "canManagePayments", label: "Manage payments" },
  { name: "canVerifyPayments", label: "Verify payments" },
  { name: "canCreateCourses", label: "Create courses" },
  { name: "canUploadResources", label: "Upload resources" },
  { name: "canManageHomework", label: "Manage homework" },
  { name: "canManageQuizzes", label: "Manage quizzes" },
  { name: "canSendNotifications", label: "Send notifications" },
  { name: "canSendSms", label: "Send SMS" },
  { name: "canExportStudentData", label: "Export student data" },
  { name: "canManageStudentCards", label: "Manage student cards" },
  { name: "canViewFinancialReports", label: "View financial reports" }
];

function rowToInput(row: TeacherRow): TeacherInput {
  return {
    name: row.name,
    email: row.email,
    phone: row.phone ?? undefined,
    username: row.username ?? undefined,
    password: undefined,
    sendCredentialsSms: false,
    slug: row.slug,
    status: row.status,
    specialty: row.specialty ?? undefined,
    bio: row.bio ?? undefined,
    qualifications: row.qualifications ?? undefined,
    subjects: row.subjects || undefined,
    gradesTaught: row.gradesTaught || undefined,
    photoUrl: row.photoUrl ?? undefined,
    accentColor: row.accentColor,
    heroImage: row.heroImage ?? undefined,
    logoUrl: row.logoUrl ?? undefined,
    commissionRate: row.commissionRate,
    branchId: row.branchId,
    permissions: row.permissions,
    classGroupIds: row.classGroupIds
  };
}

function suggestedSlug(name: string) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function TeachersTable({
  data,
  branches,
  classes,
  currency
}: {
  data: TeacherRow[];
  branches: TeacherBranchOption[];
  classes: TeacherClassOption[];
  currency: string;
}) {
  const [globalFilter, setGlobalFilter] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [editing, setEditing] = useState<TeacherRow | null>(null);
  const [deleting, setDeleting] = useState<TeacherRow | null>(null);
  const [isPending, startTransition] = useTransition();

  const columns = useMemo<ColumnDef<TeacherRow>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Teacher",
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-700 text-white">
              <UserRound className="h-5 w-5" />
            </div>
            <div>
              <Link href={`/teachers/${row.original.id}`} className="font-semibold hover:underline">
                {row.original.name}
              </Link>
              <p className="text-xs text-muted-foreground">{row.original.email}</p>
              {row.original.username ? <p className="text-xs text-muted-foreground">@{row.original.username}</p> : null}
              <p className="mt-1 flex items-center gap-1 text-xs text-teal-700">
                <Globe2 className="h-3 w-3" />
                {row.original.slug}.edutap.lk
              </p>
            </div>
          </div>
        )
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => <Badge variant={row.original.status === "ACTIVE" ? "secondary" : "outline"}>{row.original.status.toLowerCase()}</Badge>
      },
      { accessorKey: "specialty", header: "Subjects", cell: ({ row }) => row.original.subjects || row.original.specialty || "General" },
      { accessorKey: "branch", header: "Branch" },
      {
        accessorKey: "activeClasses",
        header: "Classes",
        cell: ({ row }) => (
          <div>
            <p className="font-semibold">{row.original.activeClasses}</p>
            <p className="max-w-[260px] truncate text-xs text-muted-foreground">{row.original.classes || "Unassigned"}</p>
          </div>
        )
      },
      { accessorKey: "students", header: "Students" },
      { accessorKey: "courses", header: "Courses" },
      {
        accessorKey: "grossRevenue",
        header: "Revenue",
        cell: ({ row }) => formatCurrency(row.original.grossRevenue, currency)
      },
      {
        accessorKey: "commissionDue",
        header: "Commission",
        cell: ({ row }) => (
          <div>
            <p className="font-semibold">{formatCurrency(row.original.commissionDue, currency)}</p>
            <p className="text-xs text-muted-foreground">{row.original.commissionRate}% rate</p>
          </div>
        )
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <div className="flex justify-end gap-2">
            <Button asChild variant="ghost" size="icon" aria-label="View teacher">
              <Link href={`/teachers/${row.original.id}`}>
                <Eye className="h-4 w-4" />
              </Link>
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setEditing(row.original)} aria-label="Edit teacher">
              <Pencil className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setDeleting(row.original)} aria-label="Delete teacher">
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
    data,
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
      const result = await deleteTeacher(deleting.id);
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
              <Badge variant="secondary">Faculty operations</Badge>
              <h2 className="mt-3 text-2xl font-semibold">Teachers</h2>
              <p className="mt-1 text-sm text-muted-foreground">Manage teacher profiles and class assignments.</p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="relative min-w-[260px]">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input value={globalFilter} onChange={(event) => setGlobalFilter(event.target.value)} placeholder="Search teachers..." className="pl-9" />
              </div>
              <Button onClick={() => setIsCreating(true)}>
                <Plus className="h-4 w-4" />
                Add teacher
              </Button>
            </div>
          </div>
          <TeacherDataTable table={table} columns={columns} />
        </CardContent>
      </Card>

      {isCreating ? (
        <TeacherPanel
          title="Add teacher"
          branches={branches}
          classes={classes}
          defaultValues={{ ...emptyTeacher, branchId: branches[0]?.id ?? "" }}
          onClose={() => setIsCreating(false)}
          onSubmit={createTeacher}
        />
      ) : null}
      {editing ? (
        <TeacherPanel
          title="Edit teacher"
          branches={branches}
          classes={classes}
          defaultValues={rowToInput(editing)}
          teacherId={editing.id}
          onClose={() => setEditing(null)}
          onSubmit={(values) => updateTeacher(editing.id, values)}
        />
      ) : null}
      {deleting ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-primary/35 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border bg-white p-6 shadow-luxury">
            <h3 className="text-lg font-semibold">Remove {deleting.name}?</h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">Their assigned classes will become unassigned.</p>
            <div className="mt-6 flex justify-end gap-3">
              <Button variant="outline" onClick={() => setDeleting(null)} disabled={isPending}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={confirmDelete} disabled={isPending}>
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

function TeacherPanel({
  title,
  branches,
  classes,
  defaultValues,
  teacherId,
  onClose,
  onSubmit
}: {
  title: string;
  branches: TeacherBranchOption[];
  classes: TeacherClassOption[];
  defaultValues: TeacherInput;
  teacherId?: string;
  onClose: () => void;
  onSubmit: (values: TeacherInput) => Promise<{ ok: boolean; message: string }>;
}) {
  const [isPending, startTransition] = useTransition();
  const form = useForm<TeacherInput>({
    resolver: zodResolver(teacherSchema),
    defaultValues
  });
  const selected = useWatch({ control: form.control, name: "classGroupIds" }) ?? [];
  const watchedName = useWatch({ control: form.control, name: "name" });
  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "edutap.lk";

  function toggleClass(id: string, checked: boolean) {
    form.setValue("classGroupIds", checked ? [...selected, id] : selected.filter((classId) => classId !== id), { shouldValidate: true });
  }

  function submit(values: TeacherInput) {
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
      <button className="absolute inset-0" aria-label="Close teacher form" onClick={onClose} />
      <div className="absolute right-0 top-0 h-full w-full max-w-2xl overflow-y-auto border-l bg-background p-5 shadow-luxury sm:p-7">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <Badge variant="secondary">Teacher profile</Badge>
            <h2 className="mt-3 text-2xl font-semibold">{title}</h2>
          </div>
          <Button variant="outline" size="icon" onClick={onClose} aria-label="Close">
            <X className="h-4 w-4" />
          </Button>
        </div>
        <form onSubmit={form.handleSubmit(submit)} className="space-y-5">
          <FormShell title="Teacher details" description="Profile information and branch assignment.">
            <div className="space-y-4">
              <FieldRow>
                <FormField label="Name" error={form.formState.errors.name?.message}>
                  <Input
                    {...form.register("name")}
                    onBlur={(event) => {
                      form.register("name").onBlur(event);
                      if (!form.getValues("slug")) {
                        form.setValue("slug", suggestedSlug(event.target.value), { shouldValidate: true });
                      }
                    }}
                  />
                </FormField>
                <FormField label="Email" error={form.formState.errors.email?.message}>
                  <Input type="email" {...form.register("email")} />
                </FormField>
              </FieldRow>
              <FieldRow>
                <FormField label="Phone" error={form.formState.errors.phone?.message}>
                  <Input autoComplete="tel" {...form.register("phone")} />
                </FormField>
                <FormField label="Status" error={form.formState.errors.status?.message}>
                  <Select {...form.register("status")}>
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                  </Select>
                </FormField>
              </FieldRow>
              <FieldRow>
                <FormField label="Subdomain" error={form.formState.errors.slug?.message}>
                  <div className="flex overflow-hidden rounded-xl border bg-white">
                    <Input className="rounded-none border-0" placeholder={suggestedSlug(watchedName || "teacher-name")} {...form.register("slug")} />
                    <span className="flex items-center border-l bg-muted px-3 text-sm text-muted-foreground">.{rootDomain}</span>
                  </div>
                </FormField>
                <FormField label="Branch" error={form.formState.errors.branchId?.message}>
                  <Select {...form.register("branchId")}>
                    <option value="">Unassigned</option>
                    {branches.map((branch) => (
                      <option key={branch.id} value={branch.id}>
                        {branch.name}
                      </option>
                    ))}
                  </Select>
                </FormField>
              </FieldRow>
              <FormField label="Specialty" error={form.formState.errors.specialty?.message}>
                <Input placeholder="Mathematics, Physics, English..." {...form.register("specialty")} />
              </FormField>
              <FieldRow>
                <FormField label="Subjects" error={form.formState.errors.subjects?.message}>
                  <Input placeholder="Mathematics, Statistics" {...form.register("subjects")} />
                </FormField>
                <FormField label="Grades taught" error={form.formState.errors.gradesTaught?.message}>
                  <Input placeholder="Grade 10, Grade 11" {...form.register("gradesTaught")} />
                </FormField>
              </FieldRow>
              <FormField label="Bio" error={form.formState.errors.bio?.message}>
                <Input placeholder="Short public profile summary" {...form.register("bio")} />
              </FormField>
              <FormField label="Qualifications" error={form.formState.errors.qualifications?.message}>
                <Input placeholder="BSc Mathematics, PGDE" {...form.register("qualifications")} />
              </FormField>
            </div>
          </FormShell>
          <FormShell title="Teacher login" description={teacherId ? "Update the username, reset the password, or send a fresh login SMS." : "Create the username and password for the teacher login."}>
            <div className="space-y-4">
              <FieldRow>
                <FormField label="Username" error={form.formState.errors.username?.message}>
                  <Input autoComplete="username" placeholder={suggestedSlug(watchedName || "teacher-name").replaceAll("-", ".")} {...form.register("username")} />
                </FormField>
                <FormField label={teacherId ? "New password" : "Password"} error={form.formState.errors.password?.message}>
                  <Input
                    type="password"
                    autoComplete="new-password"
                    placeholder={teacherId ? "Leave blank to keep current password" : "Leave blank to auto-generate"}
                    {...form.register("password")}
                  />
                </FormField>
              </FieldRow>
              <label className="flex items-center justify-between gap-4 rounded-xl border bg-white/70 p-4">
                <span>
                  <span className="block text-sm font-medium">Send username and password by SMS</span>
                  <span className="mt-1 block text-xs text-muted-foreground">
                    {teacherId ? "Sends a new password if the password field is blank." : "Uses the entered password, or an auto-generated one if blank."}
                  </span>
                </span>
                <Checkbox {...form.register("sendCredentialsSms")} />
              </label>
            </div>
          </FormShell>
          <FormShell title="Teacher theme" description="Public profile colors and image branding.">
            <div className="space-y-4">
              <FieldRow>
                <FormField label="Profile photo URL" error={form.formState.errors.photoUrl?.message}>
                  <Input {...form.register("photoUrl")} />
                </FormField>
                <FormField label="Theme color" error={form.formState.errors.accentColor?.message}>
                  <Input type="color" {...form.register("accentColor")} />
                </FormField>
              </FieldRow>
              <FieldRow>
                <FormField label="Hero image URL" error={form.formState.errors.heroImage?.message}>
                  <Input {...form.register("heroImage")} />
                </FormField>
                <FormField label="Logo URL" error={form.formState.errors.logoUrl?.message}>
                  <Input {...form.register("logoUrl")} />
                </FormField>
              </FieldRow>
              <FormField label="Institute commission (%)" error={form.formState.errors.commissionRate?.message}>
                <Input type="number" min="0" max="100" step="0.01" {...form.register("commissionRate", { valueAsNumber: true })} />
              </FormField>
            </div>
          </FormShell>
          <FormShell title="Teacher permissions" description="These permissions are enforced on server actions and protected APIs.">
            <div className="grid gap-3 sm:grid-cols-2">
              {permissionFields.map((permission) => (
                <label key={permission.name} className="flex items-center justify-between gap-3 rounded-xl border bg-white/70 p-4">
                  <span className="text-sm font-medium">{permission.label}</span>
                  <Checkbox {...form.register(`permissions.${permission.name}`)} />
                </label>
              ))}
            </div>
          </FormShell>
          <FormShell title="Assign classes" description="Classes assigned here will show this teacher as the class owner.">
            <div className="grid gap-3">
              {classes.map((classGroup) => {
                const disabled = Boolean(classGroup.teacherId && classGroup.teacherId !== teacherId);
                return (
                  <label key={classGroup.id} className="flex items-center justify-between gap-4 rounded-xl border bg-white/70 p-4">
                    <span>
                      <span className="block font-semibold">{classGroup.name}</span>
                      {disabled ? <span className="text-xs text-muted-foreground">Assigned to another teacher</span> : null}
                    </span>
                    <Checkbox
                      checked={selected.includes(classGroup.id)}
                      disabled={disabled}
                      onChange={(event) => toggleClass(classGroup.id, event.target.checked)}
                    />
                  </label>
                );
              })}
            </div>
          </FormShell>
          <div className="sticky bottom-0 flex justify-end gap-3 border-t bg-background/92 py-4 backdrop-blur">
            <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Save teacher
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function TeacherDataTable<TData>({
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
                    <p className="font-semibold">No teachers found</p>
                    <p className="mt-1 text-sm text-muted-foreground">Add faculty profiles to start assigning classes.</p>
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
