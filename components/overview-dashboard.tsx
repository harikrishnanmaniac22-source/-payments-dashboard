import Link from "next/link"
import { AlertCircle, ArrowRight, Clock3, Landmark, RotateCcw } from "lucide-react"

import { DashboardHeader } from "@/components/dashboard-header"
import { KpiCard } from "@/components/kpi-card"
import { SettlementsTable } from "@/components/settlements-table"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { getDashboardData } from "@/lib/payment-data"
import { formatCompactCurrency, formatDate, formatDateTime, getChannelConfig } from "@/lib/marketplace-shared"

export async function OverviewDashboard() {
  const data = await getDashboardData()
  const hasData = data.overall.settlementCount > 0

  return (
    <div className="flex min-h-screen flex-col bg-[radial-gradient(circle_at_top_left,rgba(34,197,94,0.16),transparent_20%),radial-gradient(circle_at_top_right,rgba(14,165,233,0.16),transparent_22%),linear-gradient(180deg,#020617,#0f172a)]">
      <DashboardHeader
        title="Settlement Overview"
        description="Track receivables, pending payouts, refunds, and disputes across Amazon, Flipkart, and Myntra."
        actionHref="/uploads"
        actionLabel="Upload CSV"
      />

      <main className="flex-1 p-6">
        {!hasData ? (
          <Card className="border-white/10 bg-white/5 backdrop-blur-sm">
            <CardContent className="py-12">
              <div className="mx-auto max-w-2xl text-center">
                <p className="text-sm uppercase tracking-[0.24em] text-cyan-300/70">Ready for ingestion</p>
                <h2 className="mt-3 text-3xl font-semibold text-white">Upload your first marketplace settlement file</h2>
                <p className="mt-3 text-slate-400">
                  The dashboard will detect the marketplace from each CSV row, append or update matching settlements, and recalculate all KPIs automatically.
                </p>
                <Button asChild className="mt-6 bg-cyan-400 text-slate-950 hover:bg-cyan-300">
                  <Link href="/uploads">Open Upload Center</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <KpiCard
                title="Total Received"
                value={formatCompactCurrency(data.overall.totalReceived)}
                helper={`${data.overall.settlementCount} settlement rows across all marketplaces`}
                icon={Landmark}
              />
              <KpiCard
                title="Pending Settlements"
                value={formatCompactCurrency(data.overall.pendingSettlements)}
                helper="Outstanding payouts still waiting for settlement"
                icon={Clock3}
              />
              <KpiCard
                title="Refunds"
                value={formatCompactCurrency(data.overall.refunds)}
                helper="Refund value captured from uploaded CSV rows"
                icon={RotateCcw}
              />
              <KpiCard
                title="Disputes"
                value={formatCompactCurrency(data.overall.disputes)}
                helper="Dispute and chargeback exposure across channels"
                icon={AlertCircle}
              />
            </div>

            <div className="grid gap-4 xl:grid-cols-3">
              {data.channels.map((summary) => {
                const config = getChannelConfig(summary.channel)

                return (
                  <Card
                    key={summary.channel}
                    className={`overflow-hidden border-white/10 bg-gradient-to-br ${config.accentClass} backdrop-blur-sm`}
                  >
                    <CardHeader>
                      <CardTitle className="text-white">{summary.label}</CardTitle>
                      <CardDescription className="text-slate-300">
                        Last settlement {formatDate(summary.lastSettlementDate)}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <MetricTile label="Received" value={formatCompactCurrency(summary.totalReceived)} />
                        <MetricTile label="Pending" value={formatCompactCurrency(summary.pendingSettlements)} />
                        <MetricTile label="Refunds" value={formatCompactCurrency(summary.refunds)} />
                        <MetricTile label="Disputes" value={formatCompactCurrency(summary.disputes)} />
                      </div>
                      <div className="flex items-center justify-between text-sm text-slate-300">
                        <span>{summary.settlementCount} records tracked</span>
                        <Link href={`/channels/${summary.channel}`} className="inline-flex items-center gap-1 text-white">
                          Open channel
                          <ArrowRight className="size-4" />
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>

            <div className="grid gap-4 xl:grid-cols-[1.35fr_0.9fr]">
              <SettlementsTable
                title="Recent Settlements"
                description="Latest normalized rows across all marketplaces"
                records={data.recentSettlements}
                showChannel
              />

              <Card className="border-white/10 bg-white/5 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-white">Recent Upload Batches</CardTitle>
                  <CardDescription className="text-slate-400">
                    CSV ingestions that updated the dashboard dataset
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {data.recentUploads.map((upload) => (
                    <div key={upload.id} className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="font-medium text-white">{upload.fileName}</p>
                          <p className="text-sm text-slate-400">{formatDateTime(upload.uploadedAt)}</p>
                        </div>
                        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">
                          {upload.channels.join(", ")}
                        </span>
                      </div>
                      <div className="mt-3 grid grid-cols-3 gap-3 text-sm">
                        <MetricTile label="Inserted" value={upload.insertedCount.toString()} compact />
                        <MetricTile label="Updated" value={upload.updatedCount.toString()} compact />
                        <MetricTile label="Skipped" value={upload.skippedCount.toString()} compact />
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

function MetricTile({
  label,
  value,
  compact = false,
}: {
  label: string
  value: string
  compact?: boolean
}) {
  return (
    <div className={`rounded-2xl border border-white/10 bg-slate-950/45 ${compact ? "p-3" : "p-4"}`}>
      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{label}</p>
      <p className={`${compact ? "mt-2 text-lg" : "mt-2 text-xl"} font-semibold text-white`}>{value}</p>
    </div>
  )
}
