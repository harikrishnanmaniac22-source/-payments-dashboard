import Link from "next/link"
import { ArrowRight, DatabaseZap, FileSpreadsheet, ShieldCheck, type LucideIcon } from "lucide-react"

import { DashboardHeader } from "@/components/dashboard-header"
import { UploadCsvForm } from "@/components/upload-csv-form"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { getUploadHistory } from "@/lib/payment-data"
import { formatDateTime } from "@/lib/marketplace-shared"

export const dynamic = "force-dynamic"

const parserRules = [
  "Identify the marketplace from `channel`, `marketplace`, or the file name.",
  "Normalize rows into a single settlements schema for Amazon, Flipkart, and Myntra.",
  "Support Amazon reconciliation uploads with `order_id`, `sku`, `invoice_amount`, `settlement`, and delivery status values.",
  "Upsert records by channel + order + sku + status + settlement.",
  "Recalculate overview and channel KPIs immediately after upload.",
]

export default async function UploadsPage() {
  const uploads = await getUploadHistory()

  return (
    <div className="flex min-h-screen flex-col bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.12),transparent_18%),linear-gradient(180deg,#020617,#0f172a)]">
      <DashboardHeader
        title="Upload Center"
        description="Bring in marketplace payout CSVs, validate them, and refresh Amazon, Flipkart, and Myntra views."
      />

      <main className="flex-1 space-y-6 p-6">
        <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
          <UploadCsvForm />

          <Card className="border-white/10 bg-white/5 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-white">Processing Workflow</CardTitle>
              <CardDescription className="text-slate-400">
                How each uploaded CSV is handled inside the dashboard
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {parserRules.map((rule, index) => (
                <div key={rule} className="flex gap-3 rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-cyan-400/15 text-sm font-semibold text-cyan-200">
                    {index + 1}
                  </div>
                  <p className="text-sm text-slate-300">{rule}</p>
                </div>
              ))}
              <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-4 text-sm text-emerald-200">
                Production note: this local workspace persists data to a JSON store. The architecture doc outlines a Postgres schema for scaling this to production, and the Amazon template now reflects a reconciliation-ready layout.
              </div>
              <div className="grid gap-2">
                <Button asChild variant="outline" className="w-full border-white/10 bg-transparent text-white hover:bg-white/5">
                  <Link href="/templates/amazon-template.csv">
                    <FileSpreadsheet className="size-4" />
                    Amazon template.csv
                  </Link>
                </Button>
                <Button asChild variant="outline" className="w-full border-white/10 bg-transparent text-white hover:bg-white/5">
                  <Link href="/templates/flipkart-template.csv">
                    <FileSpreadsheet className="size-4" />
                    Flipkart template.csv
                  </Link>
                </Button>
                <Button asChild variant="outline" className="w-full border-white/10 bg-transparent text-white hover:bg-white/5">
                  <Link href="/templates/myntra-template.csv">
                    <FileSpreadsheet className="size-4" />
                    Myntra template.csv
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <InfoCard
            title="Validated Columns"
            description="Flexible aliases are supported for amounts, dates, identifiers, SKU-level rows, and Amazon delivery statuses."
            icon={ShieldCheck}
          />
          <InfoCard
            title="Channel Routing"
            description="Rows are automatically grouped into Amazon, Flipkart, or Myntra channel pages."
            icon={ArrowRight}
          />
          <InfoCard
            title="Persistence"
            description="Uploaded rows are stored in a normalized local settlement store and reused across page refreshes."
            icon={DatabaseZap}
          />
        </div>

        <Card className="border-white/10 bg-white/5 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-white">Upload History</CardTitle>
            <CardDescription className="text-slate-400">
              Most recent ingestion batches written into the local store
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {uploads.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-white/10 bg-slate-950/40 p-4 text-sm text-slate-400">
                No upload batches yet.
              </p>
            ) : (
              uploads.map((upload) => (
                <div key={upload.id} className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-medium text-white">{upload.fileName}</p>
                      <p className="text-sm text-slate-400">{formatDateTime(upload.uploadedAt)}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-300">
                      <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
                        {upload.channels.join(", ")}
                      </span>
                      <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
                        {upload.rowCount} rows
                      </span>
                    </div>
                  </div>
                  <p className="mt-3 text-sm text-slate-300">
                    Inserted {upload.insertedCount}, updated {upload.updatedCount}, skipped {upload.skippedCount}
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}

function InfoCard({
  title,
  description,
  icon: Icon,
}: {
  title: string
  description: string
  icon: LucideIcon
}) {
  return (
    <Card className="border-white/10 bg-white/5 backdrop-blur-sm">
      <CardHeader className="flex flex-row items-center gap-3 space-y-0">
        <div className="rounded-xl border border-white/10 bg-white/5 p-3">
          <Icon className="size-4 text-cyan-200" />
        </div>
        <div>
          <CardTitle className="text-white">{title}</CardTitle>
          <CardDescription className="text-slate-400">{description}</CardDescription>
        </div>
      </CardHeader>
    </Card>
  )
}
