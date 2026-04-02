"use client"
import React from "react"

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip, Legend } from "recharts"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"

interface StatusData {
  name: string
  value: number
}

interface StatusPieChartProps {
  data: StatusData[]
}

const COLORS: Record<string, string> = {
  delivered: "#10b981",     // Emerald-500
  rto: "#f59e0b",           // Amber-500
  rtv: "#ef4444",           // Red-500
  not_delivered: "#64748b", // Slate-500
  pending: "#3b82f6",       // Blue-500
}

const STATUS_LABELS: Record<string, string> = {
  delivered: "Delivered",
  rto: "RTO (Return to Origin)",
  rtv: "RTV (Return to Vendor)",
  not_delivered: "Not Delivered",
  pending: "Pending",
}

export const StatusPieChart = React.memo(function StatusPieChart({ data }: StatusPieChartProps) {
  const formattedData = data.map(item => ({
    ...item,
    displayName: STATUS_LABELS[item.name] || item.name,
    color: COLORS[item.name] || "#cbd5e1"
  }))

  return (
    <Card className="border-white/10 bg-slate-900/50">
      <CardHeader>
        <CardTitle className="text-lg font-medium text-white">Status Distribution</CardTitle>
        <CardDescription>Breakdown of order reconciliation outcomes</CardDescription>
      </CardHeader>
      <CardContent className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={formattedData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={80}
              paddingAngle={5}
              dataKey="value"
              nameKey="displayName"
            >
              {formattedData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} stroke="transparent" />
              ))}
            </Pie>
            <Tooltip 
              contentStyle={{ backgroundColor: "#0f172a", border: "1px solid #1e293b", borderRadius: "8px" }}
              itemStyle={{ color: "#f8fafc" }}
            />
            <Legend 
              formatter={(value) => <span className="text-xs text-slate-300">{value}</span>}
            />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
})