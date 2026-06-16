"use client";

import { useState, useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowDown, ArrowUp, Loader2, Pencil, Plus, Power, X } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { createGrade, setGradeActive, updateGrade } from "@/app/(dashboard)/grades/actions";
import { FieldRow, FormField, FormShell } from "@/components/forms/form-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { gradeSchema, type GradeInput } from "@/lib/validations";

export type GradeRow = {
  id: string;
  name: string;
  order: number;
  isActive: boolean;
  courses: number;
  classes: number;
};

const emptyGrade: GradeInput = {
  name: "",
  order: 0,
  isActive: true
};

export function GradesManager({ grades }: { grades: GradeRow[] }) {
  const [panel, setPanel] = useState<GradeRow | "new" | null>(null);
  const [isPending, startTransition] = useTransition();

  function toggleGrade(grade: GradeRow) {
    startTransition(async () => {
      const result = await setGradeActive(grade.id, !grade.isActive);
      if (result.ok) toast.success(result.message);
      else toast.error(result.message);
    });
  }

  return (
    <>
      <div className="space-y-6">
        <section className="glass-panel rounded-2xl p-6">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div>
              <Badge variant="secondary">Academic setup</Badge>
              <h2 className="mt-3 text-2xl font-semibold">Grades</h2>
              <p className="mt-1 text-sm text-muted-foreground">Manage grade order, custom levels, and availability for courses and class groups.</p>
            </div>
            <Button onClick={() => setPanel("new")}>
              <Plus className="h-4 w-4" />
              Add grade
            </Button>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {grades.map((grade, index) => (
            <Card key={grade.id} className="glass-panel">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <Badge variant={grade.isActive ? "success" : "outline"}>{grade.isActive ? "active" : "disabled"}</Badge>
                    <h3 className="mt-4 text-xl font-semibold">{grade.name}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">Order {grade.order}</p>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => setPanel(grade)} aria-label="Edit grade">
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => toggleGrade(grade)} disabled={isPending} aria-label="Toggle grade">
                      <Power className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="mt-5 grid grid-cols-2 gap-3">
                  <div className="rounded-xl border bg-white/70 p-3">
                    <p className="text-xs text-muted-foreground">Courses</p>
                    <p className="mt-1 text-2xl font-semibold">{grade.courses}</p>
                  </div>
                  <div className="rounded-xl border bg-white/70 p-3">
                    <p className="text-xs text-muted-foreground">Classes</p>
                    <p className="mt-1 text-2xl font-semibold">{grade.classes}</p>
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
                  <ArrowUp className="h-3.5 w-3.5" />
                  <span>{index === 0 ? "First in order" : "Lower order moves up"}</span>
                  <ArrowDown className="ml-auto h-3.5 w-3.5" />
                </div>
              </CardContent>
            </Card>
          ))}
        </section>
      </div>

      {panel ? (
        <GradePanel
          grade={panel === "new" ? null : panel}
          defaultOrder={grades.length}
          onClose={() => setPanel(null)}
        />
      ) : null}
    </>
  );
}

function GradePanel({ grade, defaultOrder, onClose }: { grade: GradeRow | null; defaultOrder: number; onClose: () => void }) {
  const [isPending, startTransition] = useTransition();
  const form = useForm<GradeInput>({
    resolver: zodResolver(gradeSchema),
    defaultValues: grade
      ? { name: grade.name, order: grade.order, isActive: grade.isActive }
      : { ...emptyGrade, order: defaultOrder }
  });

  function submit(values: GradeInput) {
    startTransition(async () => {
      const result = grade ? await updateGrade(grade.id, values) : await createGrade(values);
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
      <button className="absolute inset-0" aria-label="Close grade form" onClick={onClose} />
      <div className="absolute right-0 top-0 h-full w-full max-w-xl overflow-y-auto border-l bg-background p-5 shadow-luxury sm:p-7">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <Badge variant="secondary">Grade setup</Badge>
            <h2 className="mt-3 text-2xl font-semibold">{grade ? "Edit grade" : "Add grade"}</h2>
          </div>
          <Button variant="outline" size="icon" onClick={onClose} aria-label="Close">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <form onSubmit={form.handleSubmit(submit)} className="space-y-5">
          <FormShell title="Grade details" description="Use order to control how grades appear in class and course creation.">
            <div className="space-y-4">
              <FieldRow>
                <FormField label="Grade name" error={form.formState.errors.name?.message}>
                  <Input {...form.register("name")} />
                </FormField>
                <FormField label="Order" error={form.formState.errors.order?.message}>
                  <Input type="number" {...form.register("order")} />
                </FormField>
              </FieldRow>
              <label className="flex items-center gap-3 rounded-xl border bg-white/70 p-4">
                <Checkbox defaultChecked={grade?.isActive ?? true} {...form.register("isActive")} />
                <span className="text-sm font-semibold">Grade is active</span>
              </label>
            </div>
          </FormShell>
          <div className="sticky bottom-0 flex justify-end gap-3 border-t bg-background/92 py-4 backdrop-blur">
            <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Save grade
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
