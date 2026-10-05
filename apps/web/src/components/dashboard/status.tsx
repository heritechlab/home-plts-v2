import { AlertTriangle, CheckCircle2, CircleSlash, Info, OctagonAlert, WifiOff } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import type { LinkState, Severity } from "@/lib/plts/types"
import { cn } from "@/lib/utils"

const LINK: Record<LinkState, { label: string; dot: string; text: string; ring: string }> = {
  online: { label: "Online", dot: "bg-ok", text: "text-ok", ring: "border-ok/30 bg-ok/10" },
  degraded: { label: "Terganggu", dot: "bg-warn", text: "text-warn", ring: "border-warn/30 bg-warn/10" },
  offline: { label: "Offline", dot: "bg-crit", text: "text-crit", ring: "border-crit/30 bg-crit/10" },
  not_installed: {
    label: "Belum terpasang",
    dot: "bg-muted-foreground/50",
    text: "text-muted-foreground",
    ring: "border-border bg-muted/40",
  },
}

export function StatusDot({ state, className }: { state: LinkState; className?: string }) {
  const s = LINK[state]
  return (
    <span className={cn("relative inline-flex size-2", className)} aria-label={s.label}>
      {state === "online" && <span className={cn("absolute inset-0 animate-pulse-ring rounded-full", s.dot)} />}
      <span className={cn("relative size-2 rounded-full", s.dot)} />
    </span>
  )
}

export function LinkBadge({ state }: { state: LinkState }) {
  const s = LINK[state]
  const Icon = state === "not_installed" ? CircleSlash : state === "offline" ? WifiOff : null
  return (
    <Badge variant="outline" className={cn("gap-1.5 font-medium", s.ring, s.text)}>
      {Icon ? <Icon className="size-3" /> : <StatusDot state={state} />}
      {s.label}
    </Badge>
  )
}

export const SEVERITY: Record<
  Severity,
  { label: string; icon: typeof Info; text: string; bg: string; border: string }
> = {
  critical: { label: "Kritis", icon: OctagonAlert, text: "text-crit", bg: "bg-crit/10", border: "border-crit/30" },
  warning: { label: "Peringatan", icon: AlertTriangle, text: "text-warn", bg: "bg-warn/10", border: "border-warn/30" },
  info: { label: "Info", icon: Info, text: "text-info", bg: "bg-info/10", border: "border-info/30" },
  ok: { label: "Normal", icon: CheckCircle2, text: "text-ok", bg: "bg-ok/10", border: "border-ok/30" },
}

export function SeverityBadge({ severity }: { severity: Severity }) {
  const s = SEVERITY[severity]
  return (
    <Badge variant="outline" className={cn("gap-1 font-medium", s.bg, s.border, s.text)}>
      <s.icon className="size-3" />
      {s.label}
    </Badge>
  )
}

export function SeverityIcon({ severity, className }: { severity: Severity; className?: string }) {
  const s = SEVERITY[severity]
  return (
    <span className={cn("grid size-8 shrink-0 place-items-center rounded-lg border", s.bg, s.border, s.text, className)}>
      <s.icon className="size-4" />
    </span>
  )
}
