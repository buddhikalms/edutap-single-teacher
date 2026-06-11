"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const data = [
  { month: "Jan", income: 14800 },
  { month: "Feb", income: 18200 },
  { month: "Mar", income: 17100 },
  { month: "Apr", income: 22500 },
  { month: "May", income: 23800 },
  { month: "Jun", income: 26400 }
];

export function RevenueChart() {
  return (
    <Card className="glass-panel">
      <CardHeader>
        <CardTitle>Monthly income trend</CardTitle>
        <CardDescription>Revenue placeholder wired for payments reporting.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id="incomeGradient" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="5%" stopColor="#0f766e" stopOpacity={0.32} />
                  <stop offset="95%" stopColor="#0f766e" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#d9e2ec" />
              <XAxis dataKey="month" tickLine={false} axisLine={false} />
              <YAxis tickLine={false} axisLine={false} tickFormatter={(value) => `$${Number(value) / 1000}k`} />
              <Tooltip
                cursor={{ stroke: "#0f172a", strokeWidth: 1 }}
                formatter={(value) => [`$${Number(value).toLocaleString()}`, "Income"]}
                contentStyle={{ borderRadius: 12, borderColor: "#d9e2ec" }}
              />
              <Area type="monotone" dataKey="income" stroke="#0f766e" strokeWidth={3} fill="url(#incomeGradient)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
