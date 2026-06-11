"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const data = [
  { name: "Present", value: 78, color: "#0f766e" },
  { name: "Late", value: 12, color: "#d97706" },
  { name: "Absent", value: 10, color: "#e11d48" }
];

export function AttendanceChart() {
  return (
    <Card className="glass-panel" id="attendance">
      <CardHeader>
        <CardTitle>Attendance mix</CardTitle>
        <CardDescription>Today’s attendance quality snapshot.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data} dataKey="value" nameKey="name" innerRadius={58} outerRadius={88} paddingAngle={4}>
                {data.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => [`${value}%`, "Share"]} contentStyle={{ borderRadius: 12, borderColor: "#d9e2ec" }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {data.map((item) => (
            <div key={item.name} className="rounded-lg border bg-white/70 p-3 text-center">
              <span className="mx-auto mb-2 block h-2 w-8 rounded-full" style={{ backgroundColor: item.color }} />
              <p className="text-sm font-semibold">{item.value}%</p>
              <p className="text-xs text-muted-foreground">{item.name}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
