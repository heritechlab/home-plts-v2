"use client"

import { usePathname } from "next/navigation"

import { useLive } from "@/components/layout/live-provider"
import { navFor } from "@/components/layout/nav"
import { ThemeToggle } from "@/components/layout/theme-toggle"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { useNow } from "@/hooks/use-plts"
import { SITE } from "@/lib/plts/config"
import { relativeAgo, wibFmt } from "@/lib/plts/format"
import { cn } from "@/lib/utils"

export function SiteHeader() {
  const pathname = usePathname()
  const item = navFor(pathname)
  const { updatedAt } = useLive()
  const now = useNow(1000)
  const stale = now !== undefined && updatedAt !== undefined && now - updatedAt > 10_000

  return (
    <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-2 border-b border-border/60 bg-background/70 px-3 backdrop-blur-xl md:px-5 md:rounded-t-xl">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mx-1 data-[orientation=vertical]:h-4" />
      <div className="min-w-0">
        <p className="hud-label leading-none">{SITE.name}</p>
        <h1 className="truncate font-display text-sm font-semibold">{item?.title ?? "Dashboard"}</h1>
      </div>

      <div className="ml-auto flex items-center gap-2 sm:gap-3">
        <div
          className={cn(
            "flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs",
            stale ? "border-warn/40 text-warn" : "border-ok/30 text-ok",
          )}
        >
          <span className="relative flex size-2">
            {!stale && <span className="absolute inset-0 animate-pulse-ring rounded-full bg-ok" />}
            <span className={cn("relative size-2 rounded-full", stale ? "bg-warn" : "bg-ok")} />
          </span>
          <span className="font-mono font-medium tracking-wider">{stale ? "TERTUNDA" : "LIVE"}</span>
          <span className="hidden text-muted-foreground sm:inline">
            {now && updatedAt ? relativeAgo(now - updatedAt) : "menghubungkan…"}
          </span>
        </div>
        <div className="hidden text-right md:block">
          <p className="num text-sm leading-none font-medium">{now ? wibFmt.timeSec(now) : "--:--:--"}</p>
          <p className="text-[10px] text-muted-foreground">
            {now ? wibFmt.dayLong(now) : " "} · {SITE.tzLabel}
          </p>
        </div>
        <ThemeToggle />
      </div>
    </header>
  )
}
