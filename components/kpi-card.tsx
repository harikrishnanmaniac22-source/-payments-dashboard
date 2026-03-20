import type { LucideIcon } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface KpiCardProps {
  title: string
  value: string
  helper: string
  icon: LucideIcon
}

export function KpiCard({ title, value, helper, icon: Icon }: KpiCardProps) {
  return (
    <Card className="border-white/10 bg-white/5 backdrop-blur-sm">
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
        <div className="space-y-1">
          <CardTitle className="text-sm font-medium text-slate-300">{title}</CardTitle>
          <p className="text-3xl font-semibold tracking-tight text-white">{value}</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/5 p-3">
          <Icon className="size-4 text-slate-200" />
        </div>
      </CardHeader>
      <CardContent className="pt-0 text-sm text-slate-400">{helper}</CardContent>
    </Card>
  )
}
