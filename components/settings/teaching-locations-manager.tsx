"use client";

import { useState, useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Building2, Loader2, MapPin, Pencil, Plus, Power, X } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { createBranch, setBranchActive, updateBranch } from "@/app/(dashboard)/settings/branch-actions";
import { FieldRow, FormField, FormShell } from "@/components/forms/form-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { branchSchema, type BranchInput } from "@/lib/validations";

export type TeachingLocationRow = {
  id: string;
  name: string;
  code: string;
  location: string | null;
  address: string | null;
  phone: string | null;
  isActive: boolean;
  classes: number;
  students: number;
};

export function TeachingLocationsManager({ locations }: { locations: TeachingLocationRow[] }) {
  const [panel, setPanel] = useState<TeachingLocationRow | "new" | null>(null);
  const [isPending, startTransition] = useTransition();

  function toggle(location: TeachingLocationRow) {
    startTransition(async () => {
      const result = await setBranchActive(location.id, !location.isActive);
      result.ok ? toast.success(result.message) : toast.error(result.message);
    });
  }

  return (
    <>
      <Card className="glass-panel">
        <CardContent className="p-6">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <Badge variant="secondary">Teaching locations</Badge>
              <h3 className="mt-3 text-xl font-semibold">Institutes and branches</h3>
              <p className="mt-1 text-sm text-muted-foreground">Add every institute, hall, or branch where you conduct classes.</p>
            </div>
            <Button type="button" onClick={() => setPanel("new")}>
              <Plus className="h-4 w-4" /> Add location
            </Button>
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            {locations.map((location) => (
              <div key={location.id} className="rounded-2xl border bg-white/70 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex min-w-0 gap-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Building2 className="h-5 w-5" />
                    </span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="font-semibold">{location.name}</h4>
                        <Badge variant={location.isActive ? "success" : "outline"}>{location.isActive ? "active" : "disabled"}</Badge>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">{location.location || location.address || "Address not added"}</p>
                      <p className="mt-2 text-xs text-muted-foreground">{location.code} · {location.classes} classes · {location.students} students</p>
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button type="button" variant="ghost" size="icon" onClick={() => setPanel(location)} aria-label={`Edit ${location.name}`}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button type="button" variant="ghost" size="icon" onClick={() => toggle(location)} disabled={isPending} aria-label={`${location.isActive ? "Disable" : "Enable"} ${location.name}`}>
                      <Power className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {panel ? <LocationPanel location={panel === "new" ? null : panel} onClose={() => setPanel(null)} /> : null}
    </>
  );
}

function LocationPanel({ location, onClose }: { location: TeachingLocationRow | null; onClose: () => void }) {
  const [isPending, startTransition] = useTransition();
  const form = useForm<BranchInput>({
    resolver: zodResolver(branchSchema),
    defaultValues: location
      ? {
          name: location.name,
          code: location.code,
          location: location.location ?? undefined,
          address: location.address ?? undefined,
          phone: location.phone ?? undefined,
          isActive: location.isActive
        }
      : { name: "", code: "", location: "", address: "", phone: "", isActive: true }
  });

  function submit(values: BranchInput) {
    startTransition(async () => {
      const result = location ? await updateBranch(location.id, values) : await createBranch(values);
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
      <button type="button" className="absolute inset-0" onClick={onClose} aria-label="Close location form" />
      <div className="absolute right-0 top-0 h-full w-full max-w-2xl overflow-y-auto border-l bg-background p-5 shadow-luxury sm:p-7">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <Badge variant="secondary">Teaching location</Badge>
            <h2 className="mt-3 text-2xl font-semibold">{location ? "Edit location" : "Add an institute or branch"}</h2>
          </div>
          <Button type="button" variant="outline" size="icon" onClick={onClose} aria-label="Close">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <form onSubmit={form.handleSubmit(submit)} className="space-y-5">
          <FormShell title="Location details" description="This location becomes available when creating classes and registering students.">
            <div className="space-y-4">
              <FieldRow>
                <FormField label="Institute / branch name" error={form.formState.errors.name?.message}>
                  <Input placeholder="Bright Academy - Nugegoda" {...form.register("name")} />
                </FormField>
                <FormField label="Short code" error={form.formState.errors.code?.message}>
                  <Input placeholder="NUG" {...form.register("code")} />
                </FormField>
              </FieldRow>
              <FormField label="Town / area" error={form.formState.errors.location?.message}>
                <div className="relative">
                  <MapPin className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
                  <Input className="pl-9" placeholder="Nugegoda" {...form.register("location")} />
                </div>
              </FormField>
              <FormField label="Full address" error={form.formState.errors.address?.message}>
                <Input placeholder="Building, street, city" {...form.register("address")} />
              </FormField>
              <FormField label="Contact phone" error={form.formState.errors.phone?.message}>
                <Input placeholder="+94..." {...form.register("phone")} />
              </FormField>
              <label className="flex items-center gap-3 rounded-xl border bg-white/70 p-4">
                <Checkbox {...form.register("isActive")} />
                <span><span className="block text-sm font-semibold">Active location</span><span className="text-xs text-muted-foreground">Show this location in class and student forms.</span></span>
              </label>
            </div>
          </FormShell>
          <div className="flex justify-end gap-3 border-t pt-5">
            <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>Cancel</Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Save location
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
