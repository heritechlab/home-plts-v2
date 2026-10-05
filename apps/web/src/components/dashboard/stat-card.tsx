import type * as React from "react"

import { Sparkline } from "@/components/dashboard/sparkline"
import { Value } from "@/components/dashboard/metric"
import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

export function StatCard({
  label,
  icon,
  color,
  value,
  unit,
  footer,
  badge,
  trend,
  loading,
  className,
}: {
  label: string
  icon: React.ReactNode
  /** CSS color (token) for the accent; text stays in ink colors. */
  color: string
  value: React.ReactNode
  unit?: string
  footer?: React.ReactNode
  badge?: React.ReactNode
  trend?: number[]
  loading?: boolean
  className?: string
}) {
  return (
    <Card className={cn("gap-0 overflow-hidden py-0", className)}>
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px"
        style={{ background: `linear-gradient(90deg, transparent, ${color}, transparent)` }}
      />
      <div className="flex items-start justify-between gap-2 px-4 pt-4">
        <div className="flex items-center gap-2">
          <span
            className="grid size-7 place-items-center rounded-md border [&_svg]:size-4"
            style={{ color, borderColor: `color-mix(in oklch, ${color} 35%, transparent)`, background: `color-mix(in oklch, ${color} 12%, transparent)` }}
          >
            {icon}
          </span>
          <span className="text-sm text-muted-foreground">{label}</span>
        </div>
        {badge}
      </div>
      <div className="px-4 pt-3">
        {loading ? <Skeleton className="h-9 w-32" /> : <Value value={value} unit={unit} className="text-[2rem] leading-none" />}
      </div>
      <div className="mt-2 flex min-h-5 items-center px-4 text-xs text-muted-foreground">{loading ? <Skeleton className="h-3 w-24" /> : footer}</div>
      <Sparkline data={trend ?? []} color={color} className="mt-1 w-full" height={40} />
    </Card>
  )
}
