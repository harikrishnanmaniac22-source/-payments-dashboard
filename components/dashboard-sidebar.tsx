"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { FileSpreadsheet, LifeBuoy, UserRound, WalletCards } from "lucide-react"

import { LogoutButton } from "@/components/auth/logout-button"
import { dashboardPages } from "@/lib/navigation"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar"

interface DashboardSidebarProps {
  username: string
}

export function DashboardSidebar({ username }: DashboardSidebarProps) {
  const pathname = usePathname()

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border bg-[linear-gradient(180deg,rgba(15,23,42,0.96),rgba(2,6,23,0.98))]">
      <SidebarHeader className="p-4">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/20">
            <WalletCards className="size-4" />
          </div>
          <span className="text-lg font-semibold tracking-tight group-data-[collapsible=icon]:hidden">
            Settlement Hub
          </span>
        </Link>
      </SidebarHeader>

      <SidebarSeparator />

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Marketplace Views</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {dashboardPages.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)
                const ItemIcon = item.icon

                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton asChild isActive={isActive} tooltip={item.title}>
                      <Link href={item.href}>
                        <ItemIcon className="size-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarSeparator />

      <SidebarFooter className="p-2">
        <div className="mb-2 rounded-2xl border border-white/10 bg-white/5 p-3 group-data-[collapsible=icon]:px-2 group-data-[collapsible=icon]:py-3">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-xl bg-cyan-400/15 text-cyan-200">
              <UserRound className="size-4" />
            </div>
            <div className="min-w-0 group-data-[collapsible=icon]:hidden">
              <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Signed in</p>
              <p className="truncate text-sm font-medium text-slate-200">{username}</p>
            </div>
          </div>
        </div>

        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton tooltip="CSV Mapping Guide">
              <FileSpreadsheet className="size-4" />
              <span>CSV Mapping Guide</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton tooltip="Help">
              <LifeBuoy className="size-4" />
              <span>Support Notes</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <LogoutButton />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
