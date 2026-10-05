import { cookies } from "next/headers"

import { AppSidebar } from "@/components/layout/app-sidebar"
import { LiveProvider } from "@/components/layout/live-provider"
import { SiteHeader } from "@/components/layout/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"

export default async function DashboardLayout({ children }: LayoutProps<"/">) {
  const cookieStore = await cookies()
  const defaultOpen = cookieStore.get("sidebar_state")?.value !== "false"

  return (
    <LiveProvider>
      <SidebarProvider defaultOpen={defaultOpen}>
        <AppSidebar />
        <SidebarInset className="bg-transparent md:peer-data-[variant=inset]:border md:peer-data-[variant=inset]:border-border/60 md:peer-data-[variant=inset]:bg-background/40 md:peer-data-[variant=inset]:backdrop-blur-sm">
          <SiteHeader />
          <div className="flex flex-1 flex-col gap-4 p-3 md:gap-5 md:p-5">{children}</div>
        </SidebarInset>
      </SidebarProvider>
    </LiveProvider>
  )
}
