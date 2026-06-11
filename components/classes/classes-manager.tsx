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
import { BookOpen, Eye, Loader2, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { createClassGroup, createCourse, deleteClassGroup, updateClassGroup, updateCourse } from "@/app/(dashboard)/classes/actions";
import { FieldRow, FormField, FormShell } from "@/components/forms/form-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { classGroupSchema, courseSchema, type ClassGroupInput, type CourseInput } from "@/lib/validations";
import { formatCurrency } from "@/lib/utils";

export type CourseRow = {
  id: string;
  name: string;
  code: string;
  subject: string | null;
  grade: string | null;
  description: string | null;
  fee: number;
  classes: number;
};

export type ClassRow = {
  id: string;
  name: string;
  code: string;
  schedule: string;
  room: string | null;
  capacity: number;
  branchId: string;
  branch: string;
  courseId: string;
  course: string;
  subject: string | null;
  grade: string | null;
  teacherId: string | null;
  teacher: string;
  enrolled: number;
};

export type BasicOption = { id: string; name: string };

const emptyCourse: CourseInput = {
  name: "",
  code: "",
  subject: undefined,
  grade: undefined,
  description: undefined,
  fee: 0
};

const emptyClass: ClassGroupInput = {
  name: "",
  code: "",
  schedule: "",
  room: undefined,
  capacity: 30,
  branchId: "",
  courseId: "",
  teacherId: undefined
};

export function ClassesManager({
  courses,
  classes,
  branches,
  teachers
}: {
  courses: CourseRow[];
  classes: ClassRow[];
  branches: BasicOption[];
  teachers: BasicOption[];
}) {
  const [globalFilter, setGlobalFilter] = useState("");
  const [coursePanel, setCoursePanel] = useState<CourseRow | "new" | null>(null);
  const [classPanel, setClassPanel] = useState<ClassRow | "new" | null>(null);
  const [deleting, setDeleting] = useState<ClassRow | null>(null);
  const [isPending, startTransition] = useTransition();

  const columns = useMemo<ColumnDef<ClassRow>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Class",
        cell: ({ row }) => (
          <div>
            <Link href={`/classes/${row.original.id}`} className="font-semibold hover:underline">
              {row.original.name}
            </Link>
            <p className="text-xs text-muted-foreground">{row.original.code}</p>
          </div>
        )
      },
      {
        accessorKey: "course",
        header: "Course / subject",
        cell: ({ row }) => (
          <div>
            <p className="font-medium">{row.original.course}</p>
            <p className="text-xs text-muted-foreground">{row.original.subject ?? "Subject not set"} · {row.original.grade ?? "Grade not set"}</p>
          </div>
        )
      },
      { accessorKey: "teacher", header: "Teacher" },
      { accessorKey: "schedule", header: "Timetable" },
      {
        accessorKey: "enrolled",
        header: "Enrollment",
        cell: ({ row }) => (
          <div>
            <p className="font-semibold">{row.original.enrolled}/{row.original.capacity}</p>
            <div className="mt-2 h-2 w-28 rounded-full bg-muted">
              <div
                className="h-2 rounded-full bg-teal-600"
                style={{ width: `${Math.min(100, Math.round((row.original.enrolled / row.original.capacity) * 100))}%` }}
              />
            </div>
          </div>
        )
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <div className="flex justify-end gap-2">
            <Button asChild variant="ghost" size="icon" aria-label="View class">
              <Link href={`/classes/${row.original.id}`}>
                <Eye className="h-4 w-4" />
              </Link>
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setClassPanel(row.original)} aria-label="Edit class">
              <Pencil className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setDeleting(row.original)} aria-label="Delete class">
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        )
      }
    ],
    []
  );

  // TanStack Table intentionally returns function-heavy instances that React Compiler cannot memoize.
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: classes,
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
      const result = await deleteClassGroup(deleting.id);
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
      <div className="space-y-6">
        <section className="glass-panel rounded-2xl p-6">
          <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-center">
            <div>
              <Badge variant="secondary">Academic structure</Badge>
              <h2 className="mt-3 text-2xl font-semibold">Classes & courses</h2>
              <p className="mt-1 text-sm text-muted-foreground">Configure course fees, subjects, grades, teachers, timetable, and class capacity.</p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button variant="outline" onClick={() => setCoursePanel("new")}>
                <Plus className="h-4 w-4" />
                Add course
              </Button>
              <Button onClick={() => setClassPanel("new")}>
                <Plus className="h-4 w-4" />
                Add class
              </Button>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {courses.map((course) => (
            <Card key={course.id} className="glass-panel">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-white">
                    <BookOpen className="h-5 w-5" />
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => setCoursePanel(course)} aria-label="Edit course">
                    <Pencil className="h-4 w-4" />
                  </Button>
                </div>
                <h3 className="mt-5 font-semibold">{course.name}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{course.subject ?? "Subject not set"} · {course.grade ?? "Grade not set"}</p>
                <div className="mt-5 flex items-center justify-between rounded-xl border bg-white/70 p-3">
                  <span className="text-sm text-muted-foreground">{course.code}</span>
                  <span className="font-semibold">{formatCurrency(course.fee)}</span>
                </div>
                <p className="mt-3 text-sm text-muted-foreground">{course.classes} active classes</p>
              </CardContent>
            </Card>
          ))}
        </section>

        <Card className="glass-panel">
          <CardContent className="p-6">
            <div className="mb-5 flex flex-col justify-between gap-4 md:flex-row md:items-center">
              <div>
                <h3 className="text-xl font-semibold">Class groups</h3>
                <p className="mt-1 text-sm text-muted-foreground">View utilization and open enrolled student lists.</p>
              </div>
              <div className="relative md:w-[320px]">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input value={globalFilter} onChange={(event) => setGlobalFilter(event.target.value)} placeholder="Search classes..." className="pl-9" />
              </div>
            </div>
            <ClassDataTable table={table} columns={columns} />
          </CardContent>
        </Card>
      </div>

      {coursePanel ? (
        <CoursePanel
          course={coursePanel === "new" ? null : coursePanel}
          onClose={() => setCoursePanel(null)}
          onSubmit={(values) => (coursePanel === "new" ? createCourse(values) : updateCourse(coursePanel.id, values))}
        />
      ) : null}

      {classPanel ? (
        <ClassPanel
          classGroup={classPanel === "new" ? null : classPanel}
          branches={branches}
          courses={courses.map((course) => ({ id: course.id, name: course.name }))}
          teachers={teachers}
          onClose={() => setClassPanel(null)}
          onSubmit={(values) => (classPanel === "new" ? createClassGroup(values) : updateClassGroup(classPanel.id, values))}
        />
      ) : null}

      {deleting ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-primary/35 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border bg-white p-6 shadow-luxury">
            <h3 className="text-lg font-semibold">Remove {deleting.name}?</h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">Enrollments, attendance sessions, and class links will be removed.</p>
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

function CoursePanel({
  course,
  onClose,
  onSubmit
}: {
  course: CourseRow | null;
  onClose: () => void;
  onSubmit: (values: CourseInput) => Promise<{ ok: boolean; message: string }>;
}) {
  const [isPending, startTransition] = useTransition();
  const form = useForm<CourseInput>({
    resolver: zodResolver(courseSchema),
    defaultValues: course
      ? {
          name: course.name,
          code: course.code,
          subject: course.subject ?? undefined,
          grade: course.grade ?? undefined,
          description: course.description ?? undefined,
          fee: course.fee
        }
      : emptyCourse
  });

  function submit(values: CourseInput) {
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
    <SidePanel title={course ? "Edit course" : "Add course"} onClose={onClose}>
      <form onSubmit={form.handleSubmit(submit)} className="space-y-5">
        <FormShell title="Course details" description="Subject, grade, code, and fee configuration.">
          <div className="space-y-4">
            <FieldRow>
              <FormField label="Course name" error={form.formState.errors.name?.message}>
                <Input {...form.register("name")} />
              </FormField>
              <FormField label="Course code" error={form.formState.errors.code?.message}>
                <Input {...form.register("code")} />
              </FormField>
            </FieldRow>
            <FieldRow>
              <FormField label="Subject" error={form.formState.errors.subject?.message}>
                <Input {...form.register("subject")} />
              </FormField>
              <FormField label="Grade" error={form.formState.errors.grade?.message}>
                <Input {...form.register("grade")} />
              </FormField>
            </FieldRow>
            <FormField label="Fee" error={form.formState.errors.fee?.message}>
              <Input type="number" step="0.01" {...form.register("fee")} />
            </FormField>
            <FormField label="Description" error={form.formState.errors.description?.message}>
              <Textarea {...form.register("description")} />
            </FormField>
          </div>
        </FormShell>
        <PanelActions onClose={onClose} isPending={isPending} label="Save course" />
      </form>
    </SidePanel>
  );
}

function ClassPanel({
  classGroup,
  branches,
  courses,
  teachers,
  onClose,
  onSubmit
}: {
  classGroup: ClassRow | null;
  branches: BasicOption[];
  courses: BasicOption[];
  teachers: BasicOption[];
  onClose: () => void;
  onSubmit: (values: ClassGroupInput) => Promise<{ ok: boolean; message: string }>;
}) {
  const [isPending, startTransition] = useTransition();
  const form = useForm<ClassGroupInput>({
    resolver: zodResolver(classGroupSchema),
    defaultValues: classGroup
      ? {
          name: classGroup.name,
          code: classGroup.code,
          schedule: classGroup.schedule,
          room: classGroup.room ?? undefined,
          capacity: classGroup.capacity,
          branchId: classGroup.branchId,
          courseId: classGroup.courseId,
          teacherId: classGroup.teacherId ?? undefined
        }
      : { ...emptyClass, branchId: branches[0]?.id ?? "", courseId: courses[0]?.id ?? "" }
  });

  function submit(values: ClassGroupInput) {
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
    <SidePanel title={classGroup ? "Edit class" : "Add class"} onClose={onClose}>
      <form onSubmit={form.handleSubmit(submit)} className="space-y-5">
        <FormShell title="Class details" description="Assign course, branch, teacher, timetable, room, and capacity.">
          <div className="space-y-4">
            <FieldRow>
              <FormField label="Class name" error={form.formState.errors.name?.message}>
                <Input {...form.register("name")} />
              </FormField>
              <FormField label="Class code" error={form.formState.errors.code?.message}>
                <Input {...form.register("code")} />
              </FormField>
            </FieldRow>
            <FieldRow>
              <FormField label="Course" error={form.formState.errors.courseId?.message}>
                <Select {...form.register("courseId")}>
                  {courses.map((course) => (
                    <option key={course.id} value={course.id}>
                      {course.name}
                    </option>
                  ))}
                </Select>
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
              <FormField label="Teacher" error={form.formState.errors.teacherId?.message}>
                <Select {...form.register("teacherId")}>
                  <option value="">Unassigned</option>
                  {teachers.map((teacher) => (
                    <option key={teacher.id} value={teacher.id}>
                      {teacher.name}
                    </option>
                  ))}
                </Select>
              </FormField>
              <FormField label="Capacity" error={form.formState.errors.capacity?.message}>
                <Input type="number" {...form.register("capacity")} />
              </FormField>
            </FieldRow>
            <FieldRow>
              <FormField label="Room" error={form.formState.errors.room?.message}>
                <Input {...form.register("room")} />
              </FormField>
              <FormField label="Timetable" error={form.formState.errors.schedule?.message}>
                <Input placeholder="Mon, Wed 16:00-18:00" {...form.register("schedule")} />
              </FormField>
            </FieldRow>
          </div>
        </FormShell>
        <PanelActions onClose={onClose} isPending={isPending} label="Save class" />
      </form>
    </SidePanel>
  );
}

function SidePanel({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-primary/35 backdrop-blur-sm">
      <button className="absolute inset-0" aria-label="Close form" onClick={onClose} />
      <div className="absolute right-0 top-0 h-full w-full max-w-2xl overflow-y-auto border-l bg-background p-5 shadow-luxury sm:p-7">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <Badge variant="secondary">Academic setup</Badge>
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

function ClassDataTable<TData>({ table, columns }: { table: ReturnType<typeof useReactTable<TData>>; columns: ColumnDef<TData>[] }) {
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
                    <p className="font-semibold">No classes found</p>
                    <p className="mt-1 text-sm text-muted-foreground">Add a course and class group to begin enrollments.</p>
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
