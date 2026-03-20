import { ArrowUpFromLine } from "lucide-react"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"

interface DashboardHeaderProps {
  title: string
  description?: string
  eyebrow?: string
  actionLabel?: string
  actionHref?: string
}

export function DashboardHeader({
  title,
  description,
  eyebrow = "Marketplace Settlements",
  actionLabel,
  actionHref,
}: DashboardHeaderProps) {
  return (
    <header className="sticky top-0 z-50 flex min-h-20 shrink-0 items-center gap-4 border-b border-white/10 bg-slate-950/85 px-6 py-4 backdrop-blur">
      <div className="flex items-center gap-4">
        <SidebarTrigger className="-ml-2" />
        <Separator orientation="vertical" className="h-7 bg-white/10" />
        <div>
          <p className="text-[11px] uppercase tracking-[0.28em] text-cyan-300/80">{eyebrow}</p>
          <h1 className="text-xl font-semibold text-white">{title}</h1>
          {description && <p className="text-sm text-slate-400">{description}</p>}
        </div>
      </div>

      <div className="ml-auto flex items-center gap-3">
        <div className="hidden rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-right md:block">
          <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Mode</p>
          <p className="text-sm font-medium text-slate-200">CSV-driven local workspace</p>
        </div>

        {actionHref && actionLabel && (
          <Button asChild className="bg-cyan-400 text-slate-950 hover:bg-cyan-300">
            <Link href={actionHref}>
              <ArrowUpFromLine className="size-4" />
              {actionLabel}
            </Link>
          </Button>
        )}
      </div>
    </header>
  )
}
