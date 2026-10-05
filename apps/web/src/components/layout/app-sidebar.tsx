"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { BrandMark } from "@/components/layout/brand-mark"
import { useLive } from "@/components/layout/live-provider"
import { NAV } from "@/components/layout/nav"
import { StatusDot } from "@/components/dashboard/status"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"
import { SITE } from "@/lib/plts/config"

export function AppSidebar() {
  const pathname = usePathname()
  const { snapshot } = useLive()
  const devices = snapshot?.devices ?? []
  const online = devices.filter((d) => d.state === "online").length
  const installed = devices.filter((d) => d.state !== "not_installed").length

  return (
    <Sidebar collapsible="icon" variant="inset">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild className="hover:bg-transparent">
              <Link href="/">
                <BrandMark className="size-8 shrink-0 drop-shadow-[0_0_10px_var(--glow)]" />
                <div className="grid leading-tight">
                  <span className="font-display text-sm font-semibold tracking-wide">PLTS Monitor</span>
                  <span className="hud-label !text-[9px]">Home · v2</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {NAV.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel className="hud-label">{group.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => {
                  const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href)
                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        asChild
                        isActive={active}
                        tooltip={item.title}
                        className="data-[active=true]:shadow-[inset_2px_0_0_var(--primary)] data-[active=true]:text-primary"
                      >
                        <Link href={item.href}>
                          <item.icon />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                      {item.badge && (
                        <SidebarMenuBadge className="rounded-full border border-warn/40 px-1.5 text-[9px] font-medium tracking-wide text-warn uppercase">
                          {item.badge}
                        </SidebarMenuBadge>
                      )}
                    </SidebarMenuItem>
                  )
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="group-data-[collapsible=icon]:hidden">
        <div className="panel rounded-lg p-3">
          <div className="flex items-center justify-between">
            <span className="hud-label">Gateway</span>
            <StatusDot state={snapshot ? "online" : "offline"} />
          </div>
          <p className="mt-1.5 text-sm font-medium">{SITE.location}</p>
          <p className="text-xs text-muted-foreground">
            <span className="num">
              {online}/{installed}
            </span>{" "}
            perangkat Modbus terhubung
          </p>
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
