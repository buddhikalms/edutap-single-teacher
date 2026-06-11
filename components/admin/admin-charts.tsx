"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function RevenueOverviewChart({ data }: { data: Array<{ plan: string; revenue: number; institutes: number }> }) {
  return (
    <Card className="glass-panel">
      <CardHeader>
        <CardTitle>Revenue overview</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#d9e2ec" />
              <XAxis dataKey="plan" tickLine={false} axisLine={false} />
              <YAxis tickLine={false} axisLine={false} tickFormatter={(value) => `$${Number(value)}`} />
              <Tooltip
                formatter={(value, name) => [name === "revenue" ? `$${Number(value).toLocaleString()}` : Number(value).toLocaleString(), name]}
                contentStyle={{ borderRadius: 12, borderColor: "#d9e2ec" }}
              />
              <Bar dataKey="revenue" fill="#0f766e" radius={[8, 8, 0, 0]} name="revenue" />
              <Bar dataKey="institutes" fill="#f59e0b" radius={[8, 8, 0, 0]} name="institutes" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
