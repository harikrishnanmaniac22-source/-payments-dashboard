"use client"

import {
  BarChart3,
  Clock,
  Eye,
  LayoutDashboard,
  LineChart,
  PieChart,
  Table,
  Tv,
  Users,
  type LucideProps,
} from "lucide-react"

export type IconName =
  | "layout-dashboard"
  | "bar-chart"
  | "pie-chart"
  | "table"
  | "line-chart"
  | "tv"
  | "users"
  | "eye"
  | "clock"

const iconMap: Record<IconName, React.ComponentType<LucideProps>> = {
  "layout-dashboard": LayoutDashboard,
  "bar-chart": BarChart3,
  "pie-chart": PieChart,
  table: Table,
  "line-chart": LineChart,
  tv: Tv,
  users: Users,
  eye: Eye,
  clock: Clock,
}

interface IconProps extends LucideProps {
  name: IconName
}

export function Icon({ name, ...props }: IconProps) {
  const IconComponent = iconMap[name]
  return <IconComponent {...props} />
}
