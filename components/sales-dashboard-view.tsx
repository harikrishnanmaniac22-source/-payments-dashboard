"use client"

import { useMemo, useState } from "react"
import { CalendarRange, ChartNoAxesCombined, Package2, Wallet2, type LucideIcon } from "lucide-react"

import type { SalesRecord } from "@/lib/sales-data"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

type FilterOption = "30" | "15" | "7" | "custom"

interface SalesDashboardViewProps {
  records: SalesRecord[]
}

export function SalesDashboardView({ records }: SalesDashboardViewProps) {
  const dateBounds = useMemo(() => {
    const dates = records.map((record) => new Date(record.date))
    const min = new Date(Math.min(...dates.map((date) => date.getTime())))
    const max = new Date(Math.max(...dates.map((date) => date.getTime())))

    return {
      min: toInputDate(min),
      max: toInputDate(max),
    }
  }, [records])

  const [filter, setFilter] = useState<FilterOption>("30")
  const [customStart, setCustomStart] = useState(dateBounds.min)
  const [customEnd, setCustomEnd] = useState(dateBounds.max)

  const filteredRecords = useMemo(() => {
    const latestDate = new Date(dateBounds.max)

    return records.filter((record) => {
      const currentDate = new Date(record.date)

      if (filter === "custom") {
        const start = customStart ? new Date(customStart) : null
        const end = customEnd ? new Date(customEnd) : null

        if (start && currentDate < start) return false
        if (end && currentDate > end) return false
        return true
      }

      const days = Number(filter)
      const start = new Date(latestDate)
      start.setDate(latestDate.getDate() - (days - 1))
      return currentDate >= start && currentDate <= latestDate
    })
  }, [customEnd, customStart, dateBounds.max, filter, records])

  const metrics = useMemo(() => summarizeSales(filteredRecords), [filteredRecords])

  const channelBreakdown = useMemo(() => {
    const grouped = new Map<string, { revenue: number; units: number }>()

    filteredRecords.forEach((record) => {
      const current = grouped.get(record.channel) ?? { revenue: 0, units: 0 }
      current.revenue += record.revenue
      current.units += record.unitsSold
      grouped.set(record.channel, current)
    })

    return Array.from(grouped.entries())
      .map(([channel, values]) => ({ channel, ...values }))
      .sort((left, right) => right.revenue - left.revenue)
  }, [filteredRecords])

  const presetExamples = useMemo(
    () =>
      [
        { label: "Last 30 Days", filter: "30" as const },
        { label: "Last 15 Days", filter: "15" as const },
        { label: "Last 7 Days", filter: "7" as const },
        {
          label: "Custom Range",
          filter: "custom" as const,
          customStart: "2026-03-10",
          customEnd: "2026-03-16",
        },
      ].map((preset) => ({
        label: preset.label,
        metrics: summarizeSales(
          records.filter((record) => {
            const currentDate = new Date(record.date)
            const latestDate = new Date(dateBounds.max)

            if (preset.filter === "custom") {
              return currentDate >= new Date(preset.customStart) && currentDate <= new Date(preset.customEnd)
            }

            const start = new Date(latestDate)
            start.setDate(latestDate.getDate() - (Number(preset.filter) - 1))
            return currentDate >= start && currentDate <= latestDate
          })
        ),
      })),
    [dateBounds.max, records]
  )

  return (
    <div className="space-y-6">
      <Card className="border-white/10 bg-white/5 backdrop-blur-sm">
        <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <CardTitle className="text-white">Date Filter</CardTitle>
            <CardDescription className="text-slate-400">
              Select a preset window or switch to a custom date range.
            </CardDescription>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <label className="space-y-2 text-sm text-slate-300">
              <span>Window</span>
              <select
                value={filter}
                onChange={(event) => setFilter(event.target.value as FilterOption)}
                className="h-10 w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 text-white outline-none"
              >
                <option value="30">Last 30 Days</option>
                <option value="15">Last 15 Days</option>
                <option value="7">Last 7 Days</option>
                <option value="custom">Custom Date Range</option>
              </select>
            </label>
            <label className="space-y-2 text-sm text-slate-300">
              <span>Start Date</span>
              <input
                type="date"
                min={dateBounds.min}
                max={customEnd || dateBounds.max}
                value={customStart}
                disabled={filter !== "custom"}
                onChange={(event) => setCustomStart(event.target.value)}
                className="h-10 w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 text-white outline-none disabled:opacity-50"
              />
            </label>
            <label className="space-y-2 text-sm text-slate-300">
              <span>End Date</span>
              <input
                type="date"
                min={customStart || dateBounds.min}
                max={dateBounds.max}
                value={customEnd}
                disabled={filter !== "custom"}
                onChange={(event) => setCustomEnd(event.target.value)}
                className="h-10 w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 text-white outline-none disabled:opacity-50"
              />
            </label>
            <div className="flex items-end">
              <Button
                type="button"
                variant="outline"
                className="w-full border-white/10 bg-transparent text-white hover:bg-white/5"
                onClick={() => {
                  setFilter("30")
                  setCustomStart(dateBounds.min)
                  setCustomEnd(dateBounds.max)
                }}
              >
                Reset Filter
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Total Revenue"
          value={formatCurrency(metrics.totalRevenue)}
          helper={`Gross revenue from ${filteredRecords.length} filtered rows`}
          icon={Wallet2}
        />
        <MetricCard
          title="Total Units Sold"
          value={formatNumber(metrics.totalUnits)}
          helper={`Across ${metrics.totalOrders} orders in the selected range`}
          icon={Package2}
        />
        <MetricCard
          title="Top Channel"
          value={metrics.topChannel}
          helper={formatCurrency(metrics.topChannelRevenue)}
          icon={ChartNoAxesCombined}
        />
        <MetricCard
          title="Date Window"
          value={metrics.dateLabel}
          helper={metrics.totalRevenue > 0 ? `Avg order value ${formatCurrency(metrics.averageOrderValue)}` : "No data"}
          icon={CalendarRange}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <Card className="border-white/10 bg-white/5 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-white">Channel Revenue Mix</CardTitle>
            <CardDescription className="text-slate-400">
              Top-performing channels in the active date range
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {channelBreakdown.map((channel) => {
              const width = metrics.totalRevenue > 0 ? (channel.revenue / metrics.totalRevenue) * 100 : 0

              return (
                <div key={channel.channel} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-white">{channel.channel}</span>
                    <span className="text-slate-300">{formatCurrency(channel.revenue)}</span>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-slate-950/60">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-emerald-400"
                      style={{ width: `${width}%` }}
                    />
                  </div>
                  <p className="text-xs text-slate-500">{formatNumber(channel.units)} units sold</p>
                </div>
              )
            })}
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-white/5 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-white">Example Filter Outputs</CardTitle>
            <CardDescription className="text-slate-400">
              Snapshot metrics for each preset and one custom range example
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            {presetExamples.map((preset) => (
              <div key={preset.label} className="rounded-2xl border border-white/10 bg-slate-950/45 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{preset.label}</p>
                <p className="mt-2 text-xl font-semibold text-white">{formatCurrency(preset.metrics.totalRevenue)}</p>
                <p className="mt-1 text-sm text-slate-300">{formatNumber(preset.metrics.totalUnits)} units sold</p>
                <p className="mt-1 text-sm text-slate-400">
                  Top channel: {preset.metrics.topChannel}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card className="border-white/10 bg-white/5 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-white">Filtered Sales Rows</CardTitle>
          <CardDescription className="text-slate-400">
            Data updates immediately when the selected date range changes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="border-white/10">
                <TableHead className="text-slate-300">Date</TableHead>
                <TableHead className="text-slate-300">Channel</TableHead>
                <TableHead className="text-slate-300">Category</TableHead>
                <TableHead className="text-right text-slate-300">Units</TableHead>
                <TableHead className="text-right text-slate-300">Revenue</TableHead>
                <TableHead className="text-right text-slate-300">Net Revenue</TableHead>
                <TableHead className="text-right text-slate-300">Orders</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRecords.slice(0, 18).map((record, index) => (
                <TableRow key={`${record.date}-${record.channel}-${record.productCategory}-${index}`} className="border-white/5 hover:bg-white/5">
                  <TableCell className="text-slate-200">{record.date}</TableCell>
                  <TableCell className="font-medium text-white">{record.channel}</TableCell>
                  <TableCell className="text-slate-300">{record.productCategory}</TableCell>
                  <TableCell className="text-right text-slate-300">{formatNumber(record.unitsSold)}</TableCell>
                  <TableCell className="text-right text-slate-200">{formatCurrency(record.revenue)}</TableCell>
                  <TableCell className="text-right text-emerald-300">{formatCurrency(record.netRevenue)}</TableCell>
                  <TableCell className="text-right text-slate-300">{formatNumber(record.orders)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

function summarizeSales(records: SalesRecord[]) {
  const totalRevenue = records.reduce((sum, record) => sum + record.revenue, 0)
  const totalUnits = records.reduce((sum, record) => sum + record.unitsSold, 0)
  const totalOrders = records.reduce((sum, record) => sum + record.orders, 0)

  const revenueByChannel = records.reduce<Map<string, number>>((accumulator, record) => {
    accumulator.set(record.channel, (accumulator.get(record.channel) ?? 0) + record.revenue)
    return accumulator
  }, new Map())

  const [topChannel = "No data", topChannelRevenue = 0] =
    Array.from(revenueByChannel.entries()).sort((left, right) => right[1] - left[1])[0] ?? []

  const dates = records.map((record) => record.date).sort()
  const dateLabel =
    dates.length > 0 ? `${dates[0]} to ${dates[dates.length - 1]}` : "No date range selected"

  return {
    totalRevenue,
    totalUnits,
    totalOrders,
    topChannel,
    topChannelRevenue,
    averageOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0,
    dateLabel,
  }
}

function MetricCard({
  title,
  value,
  helper,
  icon: Icon,
}: {
  title: string
  value: string
  helper: string
  icon: LucideIcon
}) {
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

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value)
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-IN").format(Math.round(value))
}

function toInputDate(date: Date) {
  return date.toISOString().slice(0, 10)
}
