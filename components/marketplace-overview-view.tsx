"use client"

import { useMemo, useState } from "react"
import { AlertCircle, CalendarRange, Landmark, Layers3, RotateCcw } from "lucide-react"

import { KpiCard } from "@/components/kpi-card"
import { SettlementsTable } from "@/components/settlements-table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  BRANDS,
  CHANNELS,
  formatCompactCurrency,
  formatCurrency,
  formatDate,
  getBrandConfig,
  getChannelConfig,
  type BrandId,
  type ChannelId,
  type SettlementRecord,
} from "@/lib/marketplace-shared"

type FilterOption = "30" | "15" | "7" | "custom"

interface MarketplaceOverviewViewProps {
  records: SettlementRecord[]
}

export function MarketplaceOverviewView({ records }: MarketplaceOverviewViewProps) {
  const dateBounds = useMemo(() => {
    const dates = records.map((record) => new Date(record.settlementDate))

    if (dates.length === 0) {
      const today = new Date().toISOString().slice(0, 10)
      return { min: today, max: today }
    }

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
  const [selectedChannels, setSelectedChannels] = useState<ChannelId[]>([])
  const [selectedBrand, setSelectedBrand] = useState<BrandId | "all">("all")

  const filteredRecords = useMemo(() => {
    const latestDate = new Date(dateBounds.max)

    return records.filter((record) => {
      const currentDate = new Date(record.settlementDate)
      const matchesChannel =
        selectedChannels.length === 0 || selectedChannels.includes(record.channel)
      const matchesBrand = selectedBrand === "all" || record.brand === selectedBrand

      if (!matchesChannel || !matchesBrand) {
        return false
      }

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
  }, [customEnd, customStart, dateBounds.max, filter, records, selectedBrand, selectedChannels])

  const summary = useMemo(() => summarizeRecords(filteredRecords), [filteredRecords])

  const channelBreakdown = useMemo(() => {
    const grouped = new Map<ChannelId, number>()

    filteredRecords.forEach((record) => {
      grouped.set(record.channel, (grouped.get(record.channel) ?? 0) + record.totalReceived)
    })

    return CHANNELS
      .map((channel) => ({
        channel: channel.id,
        label: channel.label,
        totalReceived: grouped.get(channel.id) ?? 0,
        pillClass: channel.pillClass,
      }))
      .filter((item) => selectedChannels.length === 0 || selectedChannels.includes(item.channel))
      .sort((left, right) => right.totalReceived - left.totalReceived)
  }, [filteredRecords, selectedChannels])

  function toggleChannel(channel: ChannelId, allowMultiSelect: boolean) {
    setSelectedChannels((current) => {
      if (!allowMultiSelect) {
        if (current.length === 1 && current[0] === channel) {
          return current
        }

        return [channel]
      }

      if (current.includes(channel)) {
        return current.filter((item) => item !== channel)
      }

      if (current.length >= 2) {
        return current
      }

      return [...current, channel]
    })
  }

  function resetFilters() {
    setFilter("30")
    setCustomStart(dateBounds.min)
    setCustomEnd(dateBounds.max)
    setSelectedChannels([])
    setSelectedBrand("all")
  }

  const channelLabel =
    selectedChannels.length === 0
      ? "All marketplaces"
      : selectedChannels.map((channel) => getChannelConfig(channel).label).join(" + ")
  const brandLabel = selectedBrand === "all" ? "All brands" : getBrandConfig(selectedBrand).label

  return (
    <div className="space-y-6">
      <Card className="border-white/10 bg-white/5 backdrop-blur-sm">
        <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <CardTitle className="text-white">Overview Filters</CardTitle>
            <CardDescription className="text-slate-400">
              Filter the overview by date and marketplace. Use Overall for the full view, or hold Ctrl/Cmd while selecting a second channel.
            </CardDescription>
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
                onClick={resetFilters}
              >
                Reset Filters
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant={selectedChannels.length === 0 ? "default" : "outline"}
              className={selectedChannels.length === 0 ? "" : "border-white/10 bg-transparent text-white hover:bg-white/5"}
              onClick={() => setSelectedChannels([])}
            >
              Overall
            </Button>
            {CHANNELS.map((channel) => {
              const isSelected = selectedChannels.includes(channel.id)
              const isDisabled = !isSelected && selectedChannels.length >= 2

              return (
                <Button
                  key={channel.id}
                  type="button"
                  variant={isSelected ? "default" : "outline"}
                  className={isSelected ? "" : "border-white/10 bg-transparent text-white hover:bg-white/5"}
                  disabled={isDisabled}
                  onClick={(event) => toggleChannel(channel.id, event.ctrlKey || event.metaKey)}
                >
                  {channel.label}
                </Button>
              )
            })}
          </div>
          <p className="text-sm text-slate-400">
            Active channel filter: {channelLabel}.
          </p>
          <p className="text-sm text-slate-400">
            Active brand filter: {brandLabel}.
          </p>
          <p className="text-sm text-slate-400">
            Click one channel normally for a focused view. To add or remove a second channel, hold `Ctrl` on Windows or `Cmd` on Mac while clicking.
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          title="Total Received"
          value={formatCurrency(summary.totalReceived)}
          helper={`${summary.settlementCount} settlements in the filtered view`}
          icon={Landmark}
        />
        <KpiCard
          title="Pending Settlements"
          value={formatCurrency(summary.pendingSettlements)}
          helper="Outstanding payout amount in the selected window"
          icon={CalendarRange}
        />
        <KpiCard
          title="Refunds"
          value={formatCurrency(summary.refunds)}
          helper="Refund deductions after applying date and channel filters"
          icon={RotateCcw}
        />
        <KpiCard
          title="Disputes"
          value={formatCurrency(summary.disputes)}
          helper={`Top marketplace: ${summary.topChannel}`}
          icon={AlertCircle}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <Card className="border-white/10 bg-white/5 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-white">Channel Mix</CardTitle>
            <CardDescription className="text-slate-400">
              Received amount split across the active marketplace selection
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {channelBreakdown.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/10 bg-slate-950/40 p-6 text-sm text-slate-400">
                No settlement rows match the current filters.
              </div>
            ) : (
              channelBreakdown.map((item) => {
                const width = summary.totalReceived > 0 ? (item.totalReceived / summary.totalReceived) * 100 : 0

                return (
                  <div key={item.channel} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-white">{item.label}</span>
                        <Badge className={item.pillClass}>{formatCompactCurrency(item.totalReceived)}</Badge>
                      </div>
                      <span className="text-slate-300">{width.toFixed(1)}%</span>
                    </div>
                    <div className="h-3 overflow-hidden rounded-full bg-slate-950/60">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-emerald-400"
                        style={{ width: `${width}%` }}
                      />
                    </div>
                  </div>
                )
              })
            )}
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-white/5 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-white">Filtered Snapshot</CardTitle>
            <CardDescription className="text-slate-400">
              Quick context for the current overview selection
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <Snapshot label="Channel Scope" value={channelLabel} />
            <Snapshot label="Brand Scope" value={brandLabel} />
            <Snapshot label="Settlement Window" value={summary.dateLabel} icon={CalendarRange} />
            <Snapshot label="Latest Settlement" value={formatDate(summary.lastSettlementDate)} />
            <Snapshot label="Matched Rows" value={String(summary.settlementCount)} icon={Layers3} />
          </CardContent>
        </Card>
      </div>

      <SettlementsTable
        title="Overview Settlements"
        description="This table updates instantly when you change the overview date or marketplace filter."
        records={filteredRecords}
        showChannel
      />
    </div>
  )
}

function summarizeRecords(records: SettlementRecord[]) {
  const ordered = [...records].sort((left, right) => right.settlementDate.localeCompare(left.settlementDate))
  const dates = records.map((record) => record.settlementDate).sort()
  const totalsByChannel = records.reduce<Map<ChannelId, number>>((accumulator, record) => {
    accumulator.set(record.channel, (accumulator.get(record.channel) ?? 0) + record.totalReceived)
    return accumulator
  }, new Map())

  const [topChannelId] = Array.from(totalsByChannel.entries()).sort((left, right) => right[1] - left[1])[0] ?? []

  return {
    totalReceived: records.reduce((sum, record) => sum + record.totalReceived, 0),
    pendingSettlements: records.reduce((sum, record) => sum + record.pendingSettlements, 0),
    refunds: records.reduce((sum, record) => sum + record.refunds, 0),
    disputes: records.reduce((sum, record) => sum + record.disputes, 0),
    settlementCount: records.length,
    lastSettlementDate: ordered[0]?.settlementDate ?? null,
    topChannel: topChannelId ? getChannelConfig(topChannelId).label : "No data",
    dateLabel:
      dates.length > 0 ? `${dates[0]} to ${dates[dates.length - 1]}` : "No matching settlements",
  }
}

function Snapshot({
  label,
  value,
  icon: Icon,
}: {
  label: string
  value: string
  icon?: typeof CalendarRange
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

function toInputDate(date: Date) {
  return date.toISOString().slice(0, 10)
}
