import { cn } from "@/lib/utils";

export function FormShell({
  title,
  description,
  children,
  className
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("rounded-2xl border bg-white/82 p-5 shadow-luxury backdrop-blur-xl", className)}>
      <div className="mb-5">
        <h3 className="text-lg font-semibold">{title}</h3>
        {description ? <p className="mt-1 text-sm leading-6 text-muted-foreground">{description}</p> : null}
      </div>
      {children}
    </div>
  );
}

export function FieldRow({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-4 md:grid-cols-2">{children}</div>;
}

export function FormField({
  label,
  error,
  children
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="space-y-2">
      <span className="text-sm font-semibold text-foreground">{label}</span>
      {children}
      {error ? <span className="block text-sm text-destructive">{error}</span> : null}
    </label>
  );
}
