import type * as React from "react"

import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

/** Big number + unit, monospaced, used across tiles. */
export function Value({
  value,
  unit,
  className,
  unitClassName,
}: {
  value: React.ReactNode
  unit?: string
  className?: string
  unitClassName?: string
}) {
  return (
    <span className={cn("num font-semibold tracking-tight", className)}>
      {value}
      {unit && <span className={cn("ml-1 text-[0.5em] font-medium text-muted-foreground", unitClassName)}>{unit}</span>}
    </span>
  )
}

/** Label / value line inside detail panels. */
export function Readout({
  label,
  value,
  unit,
  hint,
  loading,
}: {
  label: string
  value: React.ReactNode
  unit?: string
  hint?: React.ReactNode
  loading?: boolean
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-2 not-last:border-b not-last:border-dashed not-last:border-border/70">
      <span className="text-sm text-muted-foreground">{label}</span>
      {loading ? (
        <Skeleton className="h-4 w-16" />
      ) : (
        <span className="text-right">
          <span className="num text-sm font-medium">{value}</span>
          {unit && <span className="ml-1 text-xs text-muted-foreground">{unit}</span>}
          {hint && <span className="block text-[11px] text-muted-foreground">{hint}</span>}
        </span>
      )}
    </div>
  )
}

/** Small boxed stat used in grids. */
export function MiniStat({
  label,
  value,
  unit,
  icon,
  tone,
  loading,
}: {
  label: string
  value: React.ReactNode
  unit?: string
  icon?: React.ReactNode
  tone?: string
  loading?: boolean
}) {
  return (
    <div className="rounded-lg border border-border/60 bg-background/40 p-3">
      <div className="flex items-center gap-1.5 text-muted-foreground">
        {icon && <span className={cn("[&_svg]:size-3.5", tone)}>{icon}</span>}
        <span className="text-xs">{label}</span>
      </div>
      {loading ? <Skeleton className="mt-2 h-6 w-20" /> : <Value value={value} unit={unit} className="mt-1 block text-xl" />}
    </div>
  )
}
