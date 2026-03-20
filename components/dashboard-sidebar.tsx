"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { FileSpreadsheet, LifeBuoy, WalletCards } from "lucide-react"

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

export function DashboardSidebar() {
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
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
