import type React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export type ReportColumn<T> = {
  key: string;
  label: string;
  render: (row: T) => React.ReactNode;
  align?: "left" | "right";
};

export function ReportTable<T>({
  title,
  rows,
  columns,
  emptyMessage = "No matching records"
}: {
  title: string;
  rows: T[];
  columns: Array<ReportColumn<T>>;
  emptyMessage?: string;
}) {
  return (
    <Card className="glass-panel">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {rows.length ? (
          <div className="overflow-x-auto rounded-xl border bg-white/75">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  {columns.map((column) => (
                    <th key={column.key} className={column.align === "right" ? "px-4 py-3 text-right" : "px-4 py-3"}>
                      {column.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {rows.map((row, index) => (
                  <tr key={index} className="transition hover:bg-slate-50/70">
                    {columns.map((column) => (
                      <td key={column.key} className={column.align === "right" ? "px-4 py-3 text-right" : "px-4 py-3"}>
                        {column.render(row)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed bg-white/60 p-8 text-center">
            <p className="font-semibold">{emptyMessage}</p>
            <p className="mt-1 text-sm text-muted-foreground">Try adjusting the date, class, or student filters.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
