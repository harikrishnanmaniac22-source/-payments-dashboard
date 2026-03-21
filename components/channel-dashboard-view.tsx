"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { AlertCircle, CalendarRange, Clock3, Download, Landmark, RotateCcw, type LucideIcon } from "lucide-react"

import { KpiCard } from "@/components/kpi-card"
import { SettlementsTable } from "@/components/settlements-table"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  BRANDS,
  formatCurrency,
  formatDate,
  formatDateTime,
  getBrandConfig,
  getChannelConfig,
  type BrandId,
  type ChannelId,
  type SettlementRecord,
  type UploadBatch,
} from "@/lib/marketplace-shared"

type FilterOption = "30" | "15" | "7" | "custom"

interface ChannelDashboardViewProps {
  channel: ChannelId
  records: SettlementRecord[]
  uploads: UploadBatch[]
}

export function ChannelDashboardView({
  channel,
  records,
  uploads,
}: ChannelDashboardViewProps) {
  const config = getChannelConfig(channel)
  const bounds = useMemo(() => {
    const dates = records.map((record) => new Date(record.settlementDate))
    if (dates.length === 0) {
      const today = new Date().toISOString().slice(0, 10)
      return { min: today, max: today }
    }

    const min = new Date(Math.min(...dates.map((date) => date.getTime())))
    const max = new Date(Math.max(...dates.map((date) => date.getTime())))
    return {
      min: min.toISOString().slice(0, 10),
      max: max.toISOString().slice(0, 10),
    }
  }, [records])

  const [filter, setFilter] = useState<FilterOption>("30")
  const [customStart, setCustomStart] = useState(bounds.min)
  const [customEnd, setCustomEnd] = useState(bounds.max)
  const [selectedBrand, setSelectedBrand] = useState<BrandId | "all">("all")

  const filteredRecords = useMemo(() => {
    return records.filter((record) => {
      const currentDate = new Date(record.settlementDate)
      const matchesBrand = selectedBrand === "all" || record.brand === selectedBrand

      if (!matchesBrand) {
        return false
      }

      if (filter === "custom") {
        const start = customStart ? new Date(customStart) : null
        const end = customEnd ? new Date(customEnd) : null
        if (start && currentDate < start) return false
        if (end && currentDate > end) return false
        return true
      }

      const latestDate = new Date(bounds.max)
      const start = new Date(latestDate)
      start.setDate(latestDate.getDate() - (Number(filter) - 1))
      return currentDate >= start && currentDate <= latestDate
    })
  }, [bounds.max, customEnd, customStart, filter, records, selectedBrand])

  const summary = useMemo(() => summarizeChannel(filteredRecords), [filteredRecords])
  const brandLabel = selectedBrand === "all" ? "All brands" : getBrandConfig(selectedBrand).label

  return (
    <div className="space-y-6">
      <Card className="border-white/10 bg-white/5 backdrop-blur-sm">
        <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <CardTitle className="text-white">{config.label} Date Filter</CardTitle>
            <CardDescription className="text-slate-400">
              Limit this channel to the last 30, 15, 7 days, or a custom settlement window.
            </CardDescription>
            <div className="mt-3">
              <Button asChild variant="outline" className="border-white/10 bg-transparent text-white hover:bg-white/5">
                <Link href={`/templates/${channel}-template.csv`}>
                  <Download className="size-4" />
                  Download {config.label} Template CSV
                </Link>
              </Button>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
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
                min={bounds.min}
                max={customEnd || bounds.max}
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
                min={customStart || bounds.min}
                max={bounds.max}
                value={customEnd}
                disabled={filter !== "custom"}
                onChange={(event) => setCustomEnd(event.target.value)}
                className="h-10 w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 text-white outline-none disabled:opacity-50"
              />
            </label>
            <label className="space-y-2 text-sm text-slate-300">
              <span>Brand</span>
              <select
                value={selectedBrand}
                onChange={(event) => setSelectedBrand(event.target.value as BrandId | "all")}
                className="h-10 w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 text-white outline-none"
              >
                <option value="all">All Brands</option>
                {BRANDS.map((brand) => (
                  <option key={brand.id} value={brand.id}>
                    {brand.label}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex items-end">
              <Button
                type="button"
                variant="outline"
                className="w-full border-white/10 bg-transparent text-white hover:bg-white/5"
                onClick={() => {
                  setFilter("30")
                  setCustomStart(bounds.min)
                  setCustomEnd(bounds.max)
                  setSelectedBrand("all")
                }}
              >
                Reset Filter
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          title="Total Received"
          value={formatCurrency(summary.totalReceived)}
          helper={`${summary.settlementCount} filtered rows for ${config.label}`}
          icon={Landmark}
        />
        <KpiCard
          title="Pending Settlements"
          value={formatCurrency(summary.pendingSettlements)}
          helper="Amount still waiting for payout release"
          icon={Clock3}
        />
        <KpiCard
          title="Refunds"
          value={formatCurrency(summary.refunds)}
          helper="Refund deductions in the selected date range"
          icon={RotateCcw}
        />
        <KpiCard
          title="Disputes"
          value={formatCurrency(summary.disputes)}
          helper="Disputes and chargebacks in the selected range"
          icon={AlertCircle}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className={`border-white/10 bg-gradient-to-br ${config.accentClass} backdrop-blur-sm`}>
          <CardHeader>
            <CardTitle className="text-white">Filtered Snapshot</CardTitle>
            <CardDescription className="text-slate-300">
              KPI context for the active settlement date range
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <Snapshot label="Window" value={summary.dateLabel} icon={CalendarRange} />
            <Snapshot label="Brand Scope" value={brandLabel} />
            <Snapshot label="Last Settlement" value={formatDate(summary.lastSettlementDate)} />
            <Snapshot label="Last Upload" value={formatDateTime(summary.lastUploadAt)} />
            <Snapshot
              label="Pending as % of Received"
              value={summary.totalReceived > 0 ? `${((summary.pendingSettlements / summary.totalReceived) * 100).toFixed(1)}%` : "0.0%"}
            />
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-white/5 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-white">Recent Uploads</CardTitle>
            <CardDescription className="text-slate-400">
              Upload history remains available for the full channel dataset
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {uploads.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-white/10 bg-slate-950/40 p-4 text-sm text-slate-400">
                No uploads yet for this marketplace.
              </p>
            ) : (
              uploads.map((upload) => (
                <div key={upload.id} className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                  <p className="font-medium text-white">{upload.fileName}</p>
                  <p className="mt-1 text-sm text-slate-400">{formatDateTime(upload.uploadedAt)}</p>
                  <p className="mt-2 text-sm text-slate-300">
                    Inserted {upload.insertedCount}, updated {upload.updatedCount}, skipped {upload.skippedCount}
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <SettlementsTable
        title={`${config.label} Settlements`}
        description="Rows update instantly when the channel date filter changes"
        records={filteredRecords}
      />
    </div>
  )
}

function summarizeChannel(records: SettlementRecord[]) {
  const ordered = [...records].sort((left, right) => right.settlementDate.localeCompare(left.settlementDate))
  const lastUploadOrdered = [...records].sort((left, right) => right.uploadedAt.localeCompare(left.uploadedAt))
  const sortedDates = records.map((record) => record.settlementDate).sort()

  return {
    totalReceived: records.reduce((sum, record) => sum + record.totalReceived, 0),
    pendingSettlements: records.reduce((sum, record) => sum + record.pendingSettlements, 0),
    refunds: records.reduce((sum, record) => sum + record.refunds, 0),
    disputes: records.reduce((sum, record) => sum + record.disputes, 0),
    settlementCount: records.length,
    lastSettlementDate: ordered[0]?.settlementDate ?? null,
    lastUploadAt: lastUploadOrdered[0]?.uploadedAt ?? null,
    dateLabel:
      sortedDates.length > 0
        ? `${sortedDates[0]} to ${sortedDates[sortedDates.length - 1]}`
        : "No matching settlements",
  }
}

function Snapshot({
  label,
  value,
  icon: Icon,
}: {
  label: string
  value: string
  icon?: LucideIcon
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/45 p-4">
      <div className="flex items-center gap-2">
        {Icon ? <Icon className="size-4 text-cyan-200" /> : null}
        <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{label}</p>
      </div>
      <p className="mt-2 text-lg font-semibold text-white">{value}</p>
    </div>
  )
}
