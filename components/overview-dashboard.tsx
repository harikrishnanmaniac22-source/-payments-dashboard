import { DashboardHeader } from "@/components/dashboard-header"
import { MarketplaceOverviewView } from "@/components/marketplace-overview-view"
import { getAllSettlementRecords } from "@/lib/payment-data"

export async function OverviewDashboard() {
  const records = await getAllSettlementRecords()

  return (
    <div className="flex min-h-screen flex-col bg-[radial-gradient(circle_at_top_left,rgba(34,197,94,0.16),transparent_20%),radial-gradient(circle_at_top_right,rgba(14,165,233,0.16),transparent_22%),linear-gradient(180deg,#020617,#0f172a)]">
      <DashboardHeader
        eyebrow="Marketplace Settlements Overview"
        title="Amazon, Flipkart, and Myntra Dashboard"
        description="Filter settlement KPIs by date and compare one marketplace, two marketplaces, or all channels together."
        actionHref="/uploads"
        actionLabel="Upload CSV"
      />

      <main className="flex-1 p-6">
        <MarketplaceOverviewView records={records} />
      </main>
    </div>
  )
}
