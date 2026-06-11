"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export function PaymentChart({ data }: { data: Array<{ month: string; income: number }> }) {
  return (
    <div className="h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id="paymentIncome" x1="0" x2="0" y1="0" y2="1">
              <stop offset="5%" stopColor="#0f766e" stopOpacity={0.34} />
              <stop offset="95%" stopColor="#0f766e" stopOpacity={0.03} />
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
          <Area type="monotone" dataKey="income" stroke="#0f766e" strokeWidth={3} fill="url(#paymentIncome)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
