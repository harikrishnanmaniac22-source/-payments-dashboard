import { AlertCircle, Clock3, Landmark, RotateCcw } from "lucide-react"
import { notFound } from "next/navigation"

import { DashboardHeader } from "@/components/dashboard-header"
import { KpiCard } from "@/components/kpi-card"
import { SettlementsTable } from "@/components/settlements-table"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { getChannelPage } from "@/lib/navigation"
import { getChannelDashboard } from "@/lib/payment-data"
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  getChannelConfig,
  isChannelId,
} from "@/lib/marketplace-shared"

export const dynamic = "force-dynamic"

interface PageProps {
  params: Promise<{
    channel: string
  }>
}

export default async function ChannelPage({ params }: PageProps) {
  const { channel } = await params

  if (!isChannelId(channel)) {
    notFound()
  }

  const page = getChannelPage(channel)
  const data = await getChannelDashboard(channel)
  const config = getChannelConfig(channel)

  return (
    <div className="flex min-h-screen flex-col bg-[radial-gradient(circle_at_top_right,rgba(14,165,233,0.12),transparent_18%),linear-gradient(180deg,#020617,#0f172a)]">
      <DashboardHeader
        title={page?.title ?? config.label}
        description={page?.description}
        actionHref="/uploads"
        actionLabel="Upload CSV"
      />

      <main className="flex-1 space-y-6 p-6">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            title="Total Received"
            value={formatCurrency(data.summary.totalReceived)}
            helper={`${data.summary.settlementCount} rows currently mapped to ${config.label}`}
            icon={Landmark}
          />
          <KpiCard
            title="Pending Settlements"
            value={formatCurrency(data.summary.pendingSettlements)}
            helper="Amount still waiting for payout release"
            icon={Clock3}
          />
          <KpiCard
            title="Refunds"
            value={formatCurrency(data.summary.refunds)}
            helper="Refund deductions detected from uploaded CSV data"
            icon={RotateCcw}
          />
          <KpiCard
            title="Disputes"
            value={formatCurrency(data.summary.disputes)}
            helper="Chargebacks and disputes currently associated with this channel"
            icon={AlertCircle}
          />
        </div>

        <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
          <Card className={`border-white/10 bg-gradient-to-br ${config.accentClass} backdrop-blur-sm`}>
            <CardHeader>
              <CardTitle className="text-white">Channel Snapshot</CardTitle>
              <CardDescription className="text-slate-300">
                A quick read of settlement health for {config.label}
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <Snapshot label="Last Settlement" value={formatDate(data.summary.lastSettlementDate)} />
              <Snapshot label="Last Upload" value={formatDateTime(data.summary.lastUploadAt)} />
              <Snapshot label="Tracked Rows" value={String(data.summary.settlementCount)} />
              <Snapshot
                label="Pending as % of Received"
                value={
                  data.summary.totalReceived > 0
                    ? `${((data.summary.pendingSettlements / data.summary.totalReceived) * 100).toFixed(1)}%`
                    : "0.0%"
                }
              />
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-white/5 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-white">Recent Uploads</CardTitle>
              <CardDescription className="text-slate-400">
                Latest CSV files that touched this channel
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.uploads.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-white/10 bg-slate-950/40 p-4 text-sm text-slate-400">
                  No uploads yet for this marketplace.
                </p>
              ) : (
                data.uploads.map((upload) => (
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
          description="Normalized settlements parsed from uploaded CSV files"
          records={data.records}
        />
      </main>
    </div>
  )
}

function Snapshot({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/45 p-4">
      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{label}</p>
      <p className="mt-2 text-lg font-semibold text-white">{value}</p>
    </div>
  )
}
