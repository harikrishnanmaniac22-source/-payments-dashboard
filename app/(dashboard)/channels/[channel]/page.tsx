import { notFound } from "next/navigation"

import { ChannelDashboardView } from "@/components/channel-dashboard-view"
import { DashboardHeader } from "@/components/dashboard-header"
import { getChannelPage } from "@/lib/navigation"
import { getChannelDashboard } from "@/lib/payment-data"
import { getChannelConfig, isChannelId } from "@/lib/marketplace-shared"

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
        <ChannelDashboardView channel={channel} records={data.records} uploads={data.uploads} />
      </main>
    </div>
  )
}
