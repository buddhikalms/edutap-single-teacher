"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export type AttendanceChartPoint = {
  name: string;
  value: number;
  color: string;
};

const emptyData = [{ name: "No marks", value: 1, color: "#cbd5e1" }];

export function AttendanceChart({ data }: { data: AttendanceChartPoint[] }) {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  const chartData = total ? data : emptyData;

  return (
    <Card className="glass-panel" id="attendance">
      <CardHeader>
        <CardTitle>Attendance mix</CardTitle>
        <CardDescription>Today&apos;s attendance quality snapshot.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={chartData} dataKey="value" nameKey="name" innerRadius={58} outerRadius={88} paddingAngle={4}>
                {chartData.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value, name) => [total ? `${value} mark${Number(value) === 1 ? "" : "s"}` : "No marks yet", name]}
                contentStyle={{ borderRadius: 12, borderColor: "#d9e2ec" }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {data.map((item) => (
            <div key={item.name} className="rounded-lg border bg-white/70 p-3 text-center">
              <span className="mx-auto mb-2 block h-2 w-8 rounded-full" style={{ backgroundColor: item.color }} />
              <p className="text-sm font-semibold">{total ? Math.round((item.value / total) * 100) : 0}%</p>
              <p className="text-xs text-muted-foreground">{item.name}</p>
              <p className="mt-1 text-[11px] font-semibold text-muted-foreground">{item.value} marks</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
