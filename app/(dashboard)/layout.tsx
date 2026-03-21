import { redirect } from "next/navigation"

import { DashboardSidebar } from "@/components/dashboard-sidebar"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { getCurrentSessionUser } from "@/lib/auth"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const sessionUser = await getCurrentSessionUser()

  if (!sessionUser) {
    redirect("/login")
  }

  return (
    <SidebarProvider>
      <DashboardSidebar username={sessionUser.username} />
      <SidebarInset className="bg-background">
        {children}
      </SidebarInset>
    </SidebarProvider>
  )
}
