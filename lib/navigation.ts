import {
  ArrowUpFromLine,
  Building2,
  LayoutDashboard,
  ShoppingBag,
  Store,
  type LucideIcon,
} from "lucide-react"

import { CHANNELS, type ChannelId } from "@/lib/marketplace-shared"

export type DashboardPage = {
  title: string
  href: string
  icon: LucideIcon
  description: string
}

export const dashboardPages: DashboardPage[] = [
  {
    title: "Overview",
    href: "/",
    icon: LayoutDashboard,
    description: "Marketplace settlement health across all channels",
  },
  {
    title: "Amazon",
    href: "/channels/amazon",
    icon: Store,
    description: "Amazon payout overview and settlement queue",
  },
  {
    title: "Flipkart",
    href: "/channels/flipkart",
    icon: Building2,
    description: "Flipkart payout overview and settlement queue",
  },
  {
    title: "Myntra",
    href: "/channels/myntra",
    icon: ShoppingBag,
    description: "Myntra payout overview and settlement queue",
  },
  {
    title: "Uploads",
    href: "/uploads",
    icon: ArrowUpFromLine,
    description: "Upload channel CSVs and recalculate dashboard KPIs",
  },
]

export function getChannelPage(channel: ChannelId) {
  const config = CHANNELS.find((item) => item.id === channel)
  if (!config) return null

  return {
    title: config.label,
    href: `/channels/${config.id}`,
    description: `${config.label} settlements, refunds, disputes, and pending payouts`,
  }
}
