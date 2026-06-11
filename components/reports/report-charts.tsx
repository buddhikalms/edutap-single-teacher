"use client";

import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const attendanceColors: Record<string, string> = {
  PRESENT: "#0f766e",
  LATE: "#d97706",
  ABSENT: "#e11d48",
  EXCUSED: "#2563eb"
};

export function AttendanceReportChart({ data }: { data: Array<{ status: string; value: number }> }) {
  return (
    <Card className="glass-panel">
      <CardHeader>
        <CardTitle>Attendance quality</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data} dataKey="value" nameKey="status" innerRadius={62} outerRadius={92} paddingAngle={4}>
                {data.map((entry) => (
                  <Cell key={entry.status} fill={attendanceColors[entry.status] ?? "#64748b"} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => [Number(value).toLocaleString(), "Records"]} contentStyle={{ borderRadius: 12, borderColor: "#d9e2ec" }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {data.map((item) => (
            <div key={item.status} className="rounded-lg border bg-white/70 p-3">
              <span className="mb-2 block h-2 w-8 rounded-full" style={{ backgroundColor: attendanceColors[item.status] ?? "#64748b" }} />
              <p className="text-sm font-semibold">{item.value}</p>
              <p className="text-xs text-muted-foreground">{item.status.toLowerCase()}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function PaymentTrendChart({ data }: { data: Array<{ label: string; paid: number; due: number }> }) {
  return (
    <Card className="glass-panel">
      <CardHeader>
        <CardTitle>Collection trend</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id="paidTrend" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="5%" stopColor="#0f766e" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#0f766e" stopOpacity={0.03} />
                </linearGradient>
                <linearGradient id="dueTrend" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="5%" stopColor="#e11d48" stopOpacity={0.26} />
                  <stop offset="95%" stopColor="#e11d48" stopOpacity={0.03} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#d9e2ec" />
              <XAxis dataKey="label" tickLine={false} axisLine={false} />
              <YAxis tickLine={false} axisLine={false} tickFormatter={(value) => `$${Number(value) / 1000}k`} />
              <Tooltip formatter={(value) => [`$${Number(value).toLocaleString()}`, ""]} contentStyle={{ borderRadius: 12, borderColor: "#d9e2ec" }} />
              <Area type="monotone" dataKey="paid" stroke="#0f766e" strokeWidth={3} fill="url(#paidTrend)" name="Paid" />
              <Area type="monotone" dataKey="due" stroke="#e11d48" strokeWidth={3} fill="url(#dueTrend)" name="Due" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

export function ClassLoadChart({ data }: { data: Array<{ name: string; students: number; capacity: number }> }) {
  return (
    <Card className="glass-panel">
      <CardHeader>
        <CardTitle>Class capacity</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#d9e2ec" />
              <XAxis dataKey="name" tickLine={false} axisLine={false} />
              <YAxis tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ borderRadius: 12, borderColor: "#d9e2ec" }} />
              <Bar dataKey="students" fill="#0f766e" radius={[8, 8, 0, 0]} name="Students" />
              <Bar dataKey="capacity" fill="#f59e0b" radius={[8, 8, 0, 0]} name="Capacity" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
