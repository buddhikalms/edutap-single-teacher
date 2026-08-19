"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { CalendarDays, Clock, Eye, Loader2, MapPin, Pencil, Plus, RotateCcw, Search, Settings2, Trash2, UsersRound, X } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { createClassGroup, deleteClassGroup, saveClassTypeOptions, updateClassGroup } from "@/app/(dashboard)/dashboard/classes/actions";
import { FieldRow, FormField, FormShell } from "@/components/forms/form-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { classGroupSchema, type ClassGroupInput } from "@/lib/validations";
import { formatCurrency } from "@/lib/utils";

type Option = { id: string; name: string };
type SubjectOption = Option & { color: string };
type ScheduleParts = { day: string; startTime: string; endTime: string };

export type ClassRow = {
  id: string;
  name: string;
  code: string;
  gradeId: string;
  grade: string;
  subjectId: string;
  subject: string;
  subjectColor: string;
  branchId: string;
  branch: string;
  schedule: string;
  room: string | null;
  capacity: number;
  classType: string;
  monthlyFee: number;
  admissionFee: number | null;
  paymentStartDate: string | null;
  freePeriodType: "NONE" | "FIRST_WEEK" | "SECOND_WEEK" | "FIRST_MONTH" | "CUSTOM_DAYS";
  freeDays: number;
  dueDay: number;
  status: "ACTIVE" | "DISABLED" | "ARCHIVED";
  enrolled: number;
};

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const DAY_ALIASES: Record<string, string> = {
  mon: "Monday",
  monday: "Monday",
  tue: "Tuesday",
  tues: "Tuesday",
  tuesday: "Tuesday",
  wed: "Wednesday",
  weds: "Wednesday",
  wednesday: "Wednesday",
  thu: "Thursday",
  thur: "Thursday",
  thurs: "Thursday",
  thursday: "Thursday",
  fri: "Friday",
  friday: "Friday",
  sat: "Saturday",
  saturday: "Saturday",
  sun: "Sunday",
  sunday: "Sunday"
};

function parseSchedule(value?: string | null): ScheduleParts {
  const schedule = value ?? "";
  const dayMatch = schedule.toLowerCase().match(/\b(mon(?:day)?|tue(?:s|sday)?|wed(?:s|nesday)?|thu(?:r|rs|rsday)?|fri(?:day)?|sat(?:urday)?|sun(?:day)?)\b/);
  const timeMatch = schedule.match(/\b(\d{1,2}:\d{2})\s*(?:-|to|--)\s*(\d{1,2}:\d{2})\b/i);

  return {
    day: dayMatch ? DAY_ALIASES[dayMatch[1]] ?? "Monday" : "Monday",
    startTime: timeMatch?.[1]?.padStart(5, "0") ?? "08:00",
    endTime: timeMatch?.[2]?.padStart(5, "0") ?? "10:00"
  };
}

function formatSchedule(parts: ScheduleParts) {
  return `${parts.day} ${parts.startTime}-${parts.endTime}`;
}

export function ClassesManager({
  classes,
  branches,
  grades,
  subjects,
  currency,
  classTypeOptions
}: {
  classes: ClassRow[];
  branches: Option[];
  grades: Option[];
  subjects: SubjectOption[];
  currency: string;
  classTypeOptions: string[];
}) {
  const [panel, setPanel] = useState<ClassRow | "new" | null>(null);
  const [deleting, setDeleting] = useState<ClassRow | null>(null);
  const [managingTypes, setManagingTypes] = useState(false);
  const [pending, startTransition] = useTransition();
  const [query, setQuery] = useState("");
  const [day, setDay] = useState("");
  const [branchId, setBranchId] = useState("");
  const [gradeId, setGradeId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [classType, setClassType] = useState("");
  const [status, setStatus] = useState("");

  const filteredClasses = useMemo(() => {
    const term = query.trim().toLowerCase();

    return classes.filter((item) => {
      const parsedSchedule = parseSchedule(item.schedule);
      const searchable = [item.name, item.code, item.grade, item.subject, item.branch, item.schedule, item.room ?? ""].join(" ").toLowerCase();

      return (
        (!term || searchable.includes(term)) &&
        (!day || parsedSchedule.day === day) &&
        (!branchId || item.branchId === branchId) &&
        (!gradeId || item.gradeId === gradeId) &&
        (!subjectId || item.subjectId === subjectId) &&
        (!classType || item.classType === classType) &&
        (!status || item.status === status)
      );
    });
  }, [branchId, classType, classes, day, gradeId, query, status, subjectId]);

  const hasFilters = Boolean(query || day || branchId || gradeId || subjectId || classType || status);
  const resetFilters = () => {
    setQuery("");
    setDay("");
    setBranchId("");
    setGradeId("");
    setSubjectId("");
    setClassType("");
    setStatus("");
  };

  return (
    <>
      <div className="space-y-6">
        <section className="glass-panel rounded-2xl p-6 sm:p-8">
          <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
            <div>
              <Badge variant="secondary">Recurring teaching</Badge>
              <h2 className="mt-4 text-3xl font-semibold">Weekly & monthly classes</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Classes have schedules, attendance, enrollments, and monthly fees. They are separate from structured courses.
              </p>
            </div>
            <div className="flex gap-3">
              <Button asChild variant="outline">
                <Link href="/settings">
                  <MapPin className="h-4 w-4" />
                  Locations
                </Link>
              </Button>
              <Button type="button" variant="outline" onClick={() => setManagingTypes(true)}>
                <Settings2 className="h-4 w-4" />
                Class types
              </Button>
              <Button onClick={() => setPanel("new")}>
                <Plus className="h-4 w-4" />
                Add class
              </Button>
            </div>
          </div>
        </section>

        <section className="glass-panel rounded-2xl p-4">
          <div className="grid gap-3 md:grid-cols-[minmax(220px,1fr)_repeat(3,minmax(150px,180px))_auto]">
            <label className="relative">
              <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
              <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search classes" className="pl-9" />
            </label>
            <Select value={day} onChange={(event) => setDay(event.target.value)} aria-label="Filter by day">
              <option value="">All days</option>
              {DAYS.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </Select>
            <Select value={branchId} onChange={(event) => setBranchId(event.target.value)} aria-label="Filter by location">
              <option value="">All locations</option>
              {branches.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </Select>
            <Select value={classType} onChange={(event) => setClassType(event.target.value)} aria-label="Filter by class type">
              <option value="">All types</option>
              {classTypeOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </Select>
            <Button type="button" variant="outline" onClick={resetFilters} disabled={!hasFilters}>
              <RotateCcw className="h-4 w-4" />
              Reset
            </Button>
          </div>
          <div className="mt-3 grid gap-3 md:grid-cols-3">
            <Select value={gradeId} onChange={(event) => setGradeId(event.target.value)} aria-label="Filter by grade">
              <option value="">All grades</option>
              {grades.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </Select>
            <Select value={subjectId} onChange={(event) => setSubjectId(event.target.value)} aria-label="Filter by subject">
              <option value="">All subjects</option>
              {subjects.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </Select>
            <Select value={status} onChange={(event) => setStatus(event.target.value)} aria-label="Filter by status">
              <option value="">All statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="DISABLED">Disabled</option>
              <option value="ARCHIVED">Archived</option>
            </Select>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredClasses.map((item) => (
            <Card key={item.id} className="glass-panel">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <Badge style={{ backgroundColor: `${item.subjectColor}18`, color: item.subjectColor }}>{item.subject}</Badge>
                  <Badge variant={item.status === "ACTIVE" ? "success" : "outline"}>{item.status.toLowerCase()}</Badge>
                </div>
                <h3 className="mt-4 text-xl font-semibold">{item.name}</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {item.grade} - {item.classType}
                </p>
                <div className="mt-4 space-y-2 rounded-xl border bg-white/70 p-4 text-sm">
                  <p className="flex gap-2">
                    <CalendarDays className="h-4 w-4 text-primary" />
                    {item.schedule}
                  </p>
                  <p className="flex gap-2">
                    <MapPin className="h-4 w-4 text-primary" />
                    {item.branch}
                  </p>
                  <p className="flex gap-2">
                    <UsersRound className="h-4 w-4 text-primary" />
                    {item.enrolled} enrolled
                  </p>
                </div>
                <div className="mt-4 flex items-center justify-between">
                  <p className="font-semibold">
                    {formatCurrency(item.monthlyFee, currency)}
                    <span className="text-xs font-normal text-muted-foreground"> / month</span>
                  </p>
                  <div className="flex">
                    <Button asChild size="icon" variant="ghost">
                      <Link href={`/dashboard/classes/${item.id}`}>
                        <Eye className="h-4 w-4" />
                      </Link>
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => setPanel(item)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => setDeleting(item)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </section>

        {!filteredClasses.length ? (
          <Card className="glass-panel">
            <CardContent className="p-10 text-center">
              <CalendarDays className="mx-auto h-10 w-10 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">No classes found</h3>
              <p className="mt-2 text-sm text-muted-foreground">Adjust the filters or add a new class.</p>
            </CardContent>
          </Card>
        ) : null}
      </div>

      {panel ? (
        <ClassPanel
          item={panel === "new" ? null : panel}
          branches={branches}
          grades={grades}
          subjects={subjects}
          classTypeOptions={classTypeOptions}
          onClose={() => setPanel(null)}
        />
      ) : null}
      {managingTypes ? <ClassTypePanel options={classTypeOptions} onClose={() => setManagingTypes(false)} /> : null}
      {deleting ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-primary/35 p-4">
          <div className="rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="font-semibold">Remove {deleting.name}?</h3>
            <div className="mt-5 flex justify-end gap-3">
              <Button variant="outline" onClick={() => setDeleting(null)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                disabled={pending}
                onClick={() =>
                  startTransition(async () => {
                    const result = await deleteClassGroup(deleting.id);
                    if (result.ok) {
                      toast.success(result.message);
                      setDeleting(null);
                    } else {
                      toast.error(result.message);
                    }
                  })
                }
              >
                {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Remove
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function ClassTypePanel({ options, onClose }: { options: string[]; onClose: () => void }) {
  const [values, setValues] = useState(() => (options.length ? options : ["Individual", "Group", "Spoken"]));
  const [pending, startTransition] = useTransition();

  const update = (index: number, value: string) => {
    setValues((current) => current.map((item, itemIndex) => (itemIndex === index ? value : item)));
  };
  const remove = (index: number) => setValues((current) => current.filter((_, itemIndex) => itemIndex !== index));
  const add = () => setValues((current) => [...current, ""]);
  const save = () =>
    startTransition(async () => {
      const cleaned = values.map((value) => value.trim()).filter(Boolean);
      const result = await saveClassTypeOptions(cleaned);
      if (result.ok) {
        toast.success(result.message);
        onClose();
      } else {
        toast.error(result.message);
      }
    });

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-primary/35">
      <button className="absolute inset-0" onClick={onClose} aria-label="Close class type manager" />
      <div className="absolute right-0 h-full w-full max-w-md overflow-y-auto bg-background p-6 shadow-xl">
        <div className="mb-5 flex justify-between">
          <div>
            <Badge variant="secondary">Class catalog</Badge>
            <h2 className="mt-3 text-2xl font-semibold">Class types</h2>
          </div>
          <Button variant="outline" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="space-y-3">
          {values.map((value, index) => (
            <div key={index} className="flex gap-2">
              <Input value={value} onChange={(event) => update(index, event.target.value)} placeholder="Class type" />
              <Button type="button" variant="outline" size="icon" onClick={() => remove(index)} disabled={values.length === 1}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
        <div className="mt-5 flex justify-between gap-3 border-t pt-5">
          <Button type="button" variant="outline" onClick={add}>
            <Plus className="h-4 w-4" />
            Add type
          </Button>
          <Button type="button" onClick={save} disabled={pending}>
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Save types
          </Button>
        </div>
      </div>
    </div>
  );
}

function ClassPanel({
  item,
  branches,
  grades,
  subjects,
  classTypeOptions,
  onClose
}: {
  item: ClassRow | null;
  branches: Option[];
  grades: Option[];
  subjects: SubjectOption[];
  classTypeOptions: string[];
  onClose: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [scheduleParts, setScheduleParts] = useState<ScheduleParts>(() => parseSchedule(item?.schedule));
  const schedule = formatSchedule(scheduleParts);
  const form = useForm<ClassGroupInput>({
    resolver: zodResolver(classGroupSchema),
    defaultValues: item
      ? {
          name: item.name,
          code: item.code,
          schedule,
          room: item.room ?? undefined,
          capacity: item.capacity,
          branchId: item.branchId,
          gradeId: item.gradeId,
          subjectId: item.subjectId,
          classType: item.classType,
          fee: item.monthlyFee,
          admissionFee: item.admissionFee ?? undefined,
          paymentStartDate: item.paymentStartDate ?? undefined,
          defaultFreePeriodType: item.freePeriodType,
          defaultFreeDays: item.freeDays,
          defaultPaymentDueDay: item.dueDay,
          status: item.status
        }
      : {
          name: "",
          code: "",
          schedule,
          room: "",
          capacity: 30,
          branchId: branches[0]?.id ?? "",
          gradeId: grades[0]?.id ?? "",
          subjectId: subjects[0]?.id ?? "",
          classType: classTypeOptions[0] ?? "Individual",
          fee: 0,
          admissionFee: 0,
          paymentStartDate: new Date().toISOString().slice(0, 10),
          defaultFreePeriodType: "NONE",
          defaultFreeDays: 0,
          defaultPaymentDueDay: 10,
          status: "ACTIVE"
        }
  });

  useEffect(() => {
    form.setValue("schedule", schedule, { shouldDirty: true, shouldValidate: true });
  }, [form, schedule]);

  const updateSchedule = (patch: Partial<ScheduleParts>) => setScheduleParts((current) => ({ ...current, ...patch }));
  const submit = (values: ClassGroupInput) =>
    startTransition(async () => {
      const result = item ? await updateClassGroup(item.id, { ...values, schedule }) : await createClassGroup({ ...values, schedule });
      if (result.ok) {
        toast.success(result.message);
        onClose();
      } else {
        toast.error(result.message);
      }
    });

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-primary/35">
      <button className="absolute inset-0" onClick={onClose} aria-label="Close class form" />
      <div className="absolute right-0 h-full w-full max-w-2xl overflow-y-auto bg-background p-6 shadow-xl">
        <div className="mb-5 flex justify-between">
          <div>
            <Badge variant="secondary">Class setup</Badge>
            <h2 className="mt-3 text-2xl font-semibold">{item ? "Edit class" : "Add class"}</h2>
          </div>
          <Button variant="outline" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <form onSubmit={form.handleSubmit(submit)} className="space-y-5">
          <FormShell title="Academic identity" description="Choose a grade and subject. No course link is required.">
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
                <FormField label="Grade" error={form.formState.errors.gradeId?.message}>
                  <Select {...form.register("gradeId")}>
                    {grades.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.name}
                      </option>
                    ))}
                  </Select>
                </FormField>
                <FormField label="Subject" error={form.formState.errors.subjectId?.message}>
                  <Select {...form.register("subjectId")}>
                    {subjects.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.name}
                      </option>
                    ))}
                  </Select>
                </FormField>
              </FieldRow>
            </div>
          </FormShell>

          <FormShell title="Schedule & location">
            <div className="space-y-4">
              <FieldRow>
                <FormField label="Class type">
                  <Select {...form.register("classType")}>
                    {classTypeOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </Select>
                </FormField>
                <FormField label="Institute / branch">
                  <Select {...form.register("branchId")}>
                    {branches.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.name}
                      </option>
                    ))}
                  </Select>
                </FormField>
              </FieldRow>

              <input type="hidden" {...form.register("schedule")} />

              <div className="grid gap-4 md:grid-cols-3">
                <FormField label="Class day" error={form.formState.errors.schedule?.message}>
                  <Select value={scheduleParts.day} onChange={(event) => updateSchedule({ day: event.target.value })}>
                    {DAYS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </Select>
                </FormField>
                <FormField label="Start time">
                  <Input type="time" value={scheduleParts.startTime} onChange={(event) => updateSchedule({ startTime: event.target.value })} />
                </FormField>
                <FormField label="End time">
                  <Input type="time" value={scheduleParts.endTime} onChange={(event) => updateSchedule({ endTime: event.target.value })} />
                </FormField>
              </div>

              <div className="flex items-center gap-2 rounded-lg border bg-white/70 px-3 py-2 text-sm font-medium">
                <Clock className="h-4 w-4 text-primary" />
                {schedule}
              </div>

              <FieldRow>
                <FormField label="Room / online note">
                  <Input {...form.register("room")} />
                </FormField>
                <FormField label="Capacity">
                  <Input type="number" {...form.register("capacity")} />
                </FormField>
              </FieldRow>

              <FieldRow>
                <FormField label="Status">
                  <Select {...form.register("status")}>
                    <option value="ACTIVE">Active</option>
                    <option value="DISABLED">Disabled</option>
                    <option value="ARCHIVED">Archived</option>
                  </Select>
                </FormField>
                <div />
              </FieldRow>
            </div>
          </FormShell>

          <FormShell title="Class payments">
            <div className="space-y-4">
              <FieldRow>
                <FormField label="Monthly fee">
                  <Input type="number" step=".01" {...form.register("fee")} />
                </FormField>
                <FormField label="Admission fee (optional)">
                  <Input type="number" step=".01" {...form.register("admissionFee")} />
                </FormField>
              </FieldRow>
              <FieldRow>
                <FormField label="Payment start date">
                  <Input type="date" {...form.register("paymentStartDate")} />
                </FormField>
                <FormField label="Due day">
                  <Input type="number" min="1" max="28" {...form.register("defaultPaymentDueDay")} />
                </FormField>
              </FieldRow>
              <FieldRow>
                <FormField label="Free period">
                  <Select {...form.register("defaultFreePeriodType")}>
                    <option value="NONE">None</option>
                    <option value="FIRST_WEEK">First week</option>
                    <option value="SECOND_WEEK">Second week</option>
                    <option value="FIRST_MONTH">First month</option>
                    <option value="CUSTOM_DAYS">Custom days</option>
                  </Select>
                </FormField>
                <FormField label="Custom free days">
                  <Input type="number" {...form.register("defaultFreeDays")} />
                </FormField>
              </FieldRow>
            </div>
          </FormShell>

          <div className="flex justify-end gap-3 border-t pt-5">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button disabled={pending}>
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Save class
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
